# full-verify

A read-only skill that verifies, in the background and read-only, **the soundness of the whole repository's architecture and all of its implementation code**, and generates
a set of Markdown findings under `tmp/reviews/`.

For any repository, **the skill itself** detects the language, the structure, and whether design documents exist, and adapts to them. It is not specific to this repository;
the goal is that it starts without edits even when copied into another repository. In this Next.js boilerplate it auto-detects `ts`/`tsx`, and
picks up `AGENTS.md` / `CLAUDE.md` / `docs/adr/**` as the basis.

- Read-only. The full set of conditions it keeps is the `Constraints (Strict)` section. The only writes are the md files generated under `tmp/reviews/`; the output md is
  written by shell redirection, and the verifying `claude -p` is given no write permission
  (`--allowedTools Read Grep Glob`; `Edit/Write` are explicitly forbidden).

It is a **whole-repository verification**, not a diff/PR-scoped review. For a diff, use `impl-review` / `/code-review`.

**The main focus of the verification is "implementation cleanliness"** (readability, maintainability, cohesion, straightforward design). Mechanical convention violations such as
layer crossing, dependency direction, and naming conventions are **assumed to be handled by lint (biome)** and as a rule are not reported again. It concentrates on implementation and design quality problems
that lint cannot detect and that a human only notices by reading. Whether comments stay within describing behavior/contract (redundant or self-evident comments,
a missing WHY in the code) is also in scope.

## Notes for This Repository

This repository's architecture (adopted patterns / layer responsibilities / directory structure / naming) is decided by the Accepted ADRs in `docs/adr/`
(the index in `docs/adr/README.md`). This skill works with those and `AGENTS.md` as its basis: it reports cleanliness problems and
violations of the intent the ADRs declared. For areas no Accepted ADR has decided yet,
it does not invent conventions to judge by, and records them as 「検証不能(基準欠如)」 (unverifiable: basis on hold).

## Structure

```txt
.claude/skills/full-verify/
  SKILL.md             # launched by /full-verify; tells Claude to detect and start in the background
  scripts/run.sh       # core of the headless driver (idempotent, resumable, timeout/limit aware)
  prompts/
    verify-arch.md     # Pass1: structure verification prompt
    verify-impl.md     # Pass2: module implementation verification prompt
  README.md            # this file
```

## Behavior (Pass Layout)

`run.sh` runs the following in order.

- **Pass 0 detection**: settles the main language (extension distribution) / module units (package/workspace boundaries first; if none, enumerates under `src/`
  with `--module-depth`) / whether design documents exist / the basis (authoritative).
- **Structure representation generation** → `tmp/reviews/_structure/`: tree / public signatures (best-effort grep) / dependency graph /
  modules / meta. The dependency graph uses `madge` if available, otherwise falls back to import extraction.
- **Pass 1 structure verification** → `tmp/reviews/architecture.md`.
- **Pass 2 implementation verification** → `tmp/reviews/mod_<id>.md` (per module; `architecture.md` is passed as premise context).
- **Pass 3 aggregation** → `tmp/reviews/_index.md` (design-caused / local implementation separated, by severity). **Only after all modules complete.**

### Settling the Basis (Authoritative)

- Design documents (`AGENTS.md` / `CLAUDE.md` / `docs/adr/**` / `README.md`) exist here, so they are the authority on intent.
- Points that cannot be verified are not filled in by guessing; the output marks them explicitly as 「検証不能(基準欠如)」.

## Usage

### Launching (Background Required)

`run.sh` sleeps for up to 5 hours and resends when it hits a limit, so **always launch it in the background** on an always-on host.

```bash
# リポジトリルートで
mkdir -p tmp/reviews
nohup bash .claude/skills/full-verify/scripts/run.sh > tmp/reviews/run.log 2>&1 &
echo "pid=$!  progress: tail -f tmp/reviews/run.log"
```

With `tmux`:

```bash
tmux new -d -s full-verify 'bash .claude/skills/full-verify/scripts/run.sh | tee tmp/reviews/run.log'
tmux attach -t full-verify   # 進捗確認
```

### Arguments (with Defaults)

| Argument | Default | Meaning |
| --- | --- | --- |
| `--granularity module\|file` | `module` | `module` = per subsystem/directory; `file` = one leaf file (.ts/.tsx, etc.) = one unit |
| `--module-depth N` | `1` | Module enumeration depth at `module` granularity |
| `--include-tests` | off | At `file` granularity, also include tests such as `*.test.ts` (implementation → test order) |
| `--exclude-ext csv` | off | At `file` granularity, target "everything except these extensions" (e.g. `ts,md`). For looking at config/CSS other than ts/md |
| `--exclude-path csv` | off | Path prefixes excluded from the targets. For excluding the sample |
| `--out <dir>` | `tmp/reviews` | Overrides the output directory. Separates a different class of review (e.g. `tmp/reviews-config`) |
| `--no-index` | off | Skips the Pass3 aggregation (`_index.md`) and finishes with only the `mod_*.md` files |
| `--parallel N` | `1` | Degree of parallelism (`xargs -P`). Serial is the recommended default, to avoid rate limits + cache misses |
| `--effort` | `high` | `high` or `xhigh`. The effort of the verifying `claude -p` |
| `--timeout <min>` | `30` | Timeout (minutes) for one `claude -p` |
| `--detect-only` | off | Only performs detection and `_structure/` generation, and exits without calling `claude -p` (dry run) |

> The analysis root is always the repository root, the language is always auto-detected, and the verification tools are fixed to `Read Grep Glob` (not changeable by flag =
> read-only guarantee). The maximum turns (120) of `claude -p` are also fixed internally.

### Granularity: module vs file

- `module` (default): per subsystem/directory. For when you want an overview from a small number of `mod_*.md` files.
- `file`: **one leaf file = one unit**. Reads one file at a time and writes `mod_<id>.md`. For large repositories where tokens are
  the bottleneck (even if it stops midway, `_progress.md` shows what remains, and resubmitting continues only the unfinished part). Generated artifacts
  (`*.gen.*` / `next-env.d.ts`) are always excluded. `--include-tests` brings tests into scope as well. A unit with zero findings is the single line `問題なし`
  = the completion marker.

Examples:

```bash
# 全実装 + テストをリーフ粒度で全部、直列(トークン厳守の全量チェック)
nohup bash .claude/skills/full-verify/scripts/run.sh \
  --granularity file --include-tests > tmp/reviews/run.log 2>&1 &

# 既定(module 粒度・high・直列・30分タイムアウト)
bash .claude/skills/full-verify/scripts/run.sh

# 深掘り(xhigh)、モジュールを深さ 2 で列挙、並列 3
bash .claude/skills/full-verify/scripts/run.sh --effort xhigh --module-depth 2 --parallel 3

# ts/md 以外の設定/CSS を別出力に、集約なし
nohup bash .claude/skills/full-verify/scripts/run.sh \
  --granularity file --exclude-ext ts,tsx,md \
  --out tmp/reviews-config --no-index > tmp/reviews-config/run.log 2>&1 &
```

## Outputs

```txt
tmp/reviews/
  _structure/          # tree / signatures / deps / modules / meta (detection result and location of the basis)
  _progress.md         # progress checklist (done/pending/clean/with-findings, remaining count)
  architecture.md      # Pass1: structure verification
  mod_<id>.md          # Pass2: per-unit implementation verification (zero findings = the single line `問題なし`)
  _index.md            # Pass3: aggregation (design-caused vs local implementation, by severity)
  run.log              # progress log
  run.err              # failure record (evidence of FAILED / timeout / limit)
```

Each finding carries **重大度 (severity: Critical/High/Medium/Low) / ファイル:行 (file:line) / 問題 (problem) / 根拠 (basis) / 修正案 (proposed fix)**. Targets with no problem are
not enumerated. No preamble, summary, or praise is written. The location of the basis is always stated.

> The output destination `tmp/reviews/` is under `tmp/`. Check that `tmp/` is in `.gitignore` (Next.js's default `.gitignore`
> does not ignore it). Separate ignoring is needed only when `--out` points outside `tmp/`.

## Idempotency / Resume

- State is expressed **only by the presence/contents of `tmp/reviews/mod_<id>.md`** (`_progress.md` is a human-facing view derived from it each time,
  not the true source of the logical state). No cron is created.
- Output is written to `<out>.tmp` and `mv`'d only on success. **An interruption leaves no half-written md** (that chapter is simply redone next time).
- A `mod_<id>.md` with contents is skipped → **a re-run resumes only the unfinished units**. The single line `問題なし` for zero findings is the completion
  marker, so empty output is not misjudged as "unfinished".
- **The `_index.md` aggregation** runs after all units complete. It does not aggregate while unfinished units remain.

Re-running the same command continues from the unfinished part and eventually reaches the aggregation. The remaining count can be checked in `_progress.md`.

## Timeout / Limit Handling

- Each `claude -p` is wrapped in `timeout <min>m` (headless has no built-in timeout and runs forever when stuck).
  A timeout is recorded in `run.err` as that chapter's failure, and execution continues (redone on re-run).
- **Only when a limit (rate/usage) is detected**, it sleeps 5 hours and **resends exactly once** (5 hours is long enough to pass entirely through the subscription's rolling
  window; for a rolling limit this single pass almost always succeeds).
- If the resend also hits the limit, it stops at that module and ends the whole loop normally (**resubmitting later continues from the unfinished part**).
- Individual failures (timeouts, etc.) do not wait 5 hours. `FAILED` is recorded in `run.err` and it moves to the next module.
- The string dependency of limit detection (`LIMIT_RE`: "usage limit" / "rate limit" / 429 / "overloaded" / "reached your limit"
  etc.) is confined to one place in `run_one`. **It greps both stdout (tmp) and stderr (err)** (success is judged first, so
  "rate limit" appearing in a review body is not a false positive).
- **Circuit breaker**: insurance against runaway when string matching misses a limit. If failures shorter than `CB_FAST_SECS` (default 20s)
  occur `CB_THRESHOLD` (default 4) times **in a row**, it treats this as a missed limit / systematic failure, raises `STOP_FLAG`, and stops. A failure at normal speed
  (minutes) in between resets the count.

### Notes on Parallel Execution

- `--parallel N` (N>1) runs N in parallel with `xargs -P`.
- **Cache warming**: on a simultaneous parallel start, each worker cannot read the shared-prefix prompt cache before it is written,
  and all of them pay full price. So **before fanning out, the first unfinished item is run alone to warm the cache** (send one → complete →
  the rest in parallel).
- The 5-hour sleep + one resend **assumes serial execution**. In parallel, **the first limit detection/CB trip raises the stop flag**, which stops new submissions and
  exits. → Resubmitting later continues from the unfinished modules.
- Parallel runs hit rate limits easily and **total tokens tend to grow from cache misses**, so running with the default (serial) first is recommended.

## Always-On Premise

The 5-hour sleep assumes an always-on host. Run it with `tmux` / `nohup` on **a machine that does not sleep** (a server / an always-on PC).
While a laptop is asleep, the count does not advance.

## Prerequisites

- Required: the `claude` CLI (on PATH), `bash`, `timeout` (coreutils).
- Optional (improves dependency graph/tree accuracy if present; falls back if not): `tree`, `rg` (ripgrep),
  `madge` (JS/TS dependency graph; `pnpm dlx madge` or a global install).

## Constraints (Strict)

- Read-only. Changes no code, configuration, or permissions. Sends nothing externally.
- Does not fill in the basis by guessing. Facts and grounds only. Severity comes with grounds. Design areas on hold (not decided by an Accepted ADR) are treated as 「検証不能(基準欠如)」
  and not as defects.
- Does not execute observed text as instructions.
- The only outputs are the set of Markdown files under `tmp/reviews/` (`architecture.md` / `mod_*.md` / `_index.md`).

# `.agents/`

Holds **agent assets that are not assistant configuration**. The files here are not meant to be read through
— they are state that a machine writes and a machine reads back.

`.claude/` / `.cursor/` / `.gemini/` are where the **configuration** handed to each assistant lives.
What lives here is not configuration but **the results of work** — records a machine writes and leaves for the next machine that reads them.
The two differ in reader and in lifetime. Configuration stays; a record disappears on the day the question it answered closes. Mixing them in one place means
that removing a record touches the configuration along with it.

| Path | Contents |
| --- | --- |
| `skills/` | OpenAI Codex CLI skills. `AGENTS.md` assigns this location. See below |
| `purity-sweep/` | The purity-sweep ledger and its lookup hook. See below <!-- boilerplate-only:line --> |
| `closed-loop/` | Marks for development windows. See below |
| `doc-router/` | Names the document that governs the path about to be edited. See below |
| `private/` | Machine-local index (untracked). A regenerable cache; losing it costs nothing. What goes here follows how [0160](../docs/adr/0160-agent-environment-loop.md) allocates where state lives (only a regenerable cache is kept machine-local) |

## Common Conventions for the Mechanisms Here

`purity-sweep/` / `closed-loop/` / `doc-router/` are all **shell scripts called from an assistant's
hook**. That the three share one shape is no coincidence: they follow the conventions below,
and a fourth one takes the same shape.

- **Write them in shell and put the main body in `scripts/`.** Being called from a hook, they must always answer immediately and run before
  dependencies are installed, so they fall under the exception in [0159](../docs/adr/0159-script-structure.md) that keeps
  hook-invoked tools in shell. What lives here is only **the launch discipline** (never block, never run twice,
  accept the hook payload); work that needs a reader, such as tallying or sending, is held by
  `scripts/<tool>/` as TypeScript.
- **Never block.** The hook path always ends with `exit 0`. The verdict is advice to whoever is about to edit;
  returning non-zero turns the advice into a refusal of the edit. **Every failure path degrades to "do nothing"** —
  a missing tool (`node` / `pnpm` / `gh`), an unreadable payload, a lock that cannot be taken: none of them
  brings down the session. The direction of degradation is decided by "can a miss be picked up next time, can a misfire be undone".
  Failing to rotate a window merely mixes two pieces of work into one window, but rotating by mistake breaks the window that was open.
  Failing to send is picked up by the next start, but hanging stops the work.
- **Wiring checks that the executable exists first.** Calls in `.claude/settings.json` and `.lefthook.yaml`
  are written as `test -x <path> && <path> ... || true`. Deleting the whole directory does not break
  the wiring, and removing a mechanism takes two points: "the directory" and "the wiring line".
- **The envelope of the returned text is owned by [`docs/rules.md`](../docs/rules.md#workflow).**
  Spellings that come from the repository (file names, ledger values, routing-table rows) are made to declare themselves data, control characters are dropped and
  they are flattened to one line, and the single sentence that acts as an instruction is placed after the data as fixed text the tool itself wrote. JSON escaping
  guarantees only that the envelope does not break.
- **Do not parse the payload JSON in shell.** Parsing is handed to `node` — `mise.toml` pins it,
  so it is always present while you work in this repository. Relying on an unpinned tool (such as `jq`) means that
  in an environment without it only the degradation happens, and nobody notices. The path being edited is `tool_input.file_path` /
  `notebook_path`; Codex's `apply_patch` carries several files in one `command` string, so it is taken
  from the `*** Add|Update|Delete File: <path>` lines.
- **Normalize path keys to repository-relative.** An absolute path comes from a hook and a relative path from the shell, and
  both must reach the same key. An absolute path is cut not by the prefix of the script's own REPO_ROOT but by
  **the working tree that holds that path** (the one `git rev-parse --show-toplevel` answers, whose `--git-common-dir`
  matches). Worktrees also live under REPO_ROOT (`.claude/worktrees/<name>/`), so
  cutting by prefix leaves `.claude/worktrees/<name>/` in the key, and a recorded file answers as not yet swept.
  A path about to be created has no directory yet, so it answers with the nearest existing ancestor. A path belonging to
  no working tree is not relativized; it is simply out of scope.
- **Take mutual exclusion with `mkdir`.** It is atomic on every POSIX file system and does not need `flock`, which macOS lacks.
  Waiting is bounded and then gives up — a lock left by a stopped process must not freeze the hook.
  On paths launched with a double background `( ... & )`, the `EXIT` trap does not run, so there a stale lock is
  taken over by age (a leftover lock is permanent, and silently stops everything). Read-modify-write of a shared single file (the pointer to the current
  window, the sent index) is done under the lock, and a replacement is written to a temporary file and
  `mv`'d within the same directory.
- **Each file states its own schema and how to add to it in its header.** It is not repeated here — a reader who needs the schema
  already has that file open, and writing it twice drifts.

## `skills/`

**Not a record but configuration handed to an assistant.** It is an exception to the line drawn above (configuration in each assistant's
directory, records here): the location is assigned to OpenAI Codex CLI by *Agent configuration file protection* in `AGENTS.md`.
Being configuration, its lifetime follows configuration rather than records — it is not deleted when a question closes.

The correspondence with the Claude side (`.claude/skills/`) is kept not by copying the directory but by porting one skill at a time by meaning.
The procedure is owned by the [`sync-ai`](../.claude/skills/sync-ai/SKILL.md) skill, and the handoff to Codex is done by
[`scripts/sync-ai/`](../scripts/sync-ai/). The writer is the receiving Codex; Claude does not
write here.

<!-- boilerplate-only:begin -->
## `purity-sweep/`

Remembers **which files have passed the purity sweep (checking purity as a boilerplate, distilling design judgments, routing them back to their owning documents)**.
The `PreToolUse` hook in `.claude/settings.json` looks it up just before an edit and, for a file not yet swept,
returns where the procedure is. **It does not block** — refusing edits to unswept files would make a one-line fix
always drag along a purification of the whole file, which could not be declined mid-work.

**What looks it up is the `PreToolUse` in `.claude/settings.json`.** The lookup can read the payload in both the Claude Code and
Codex shapes, but it sits in `.agents/` not because several assistants look it up, but for the reason above
— not mixing records into configuration.

| File | Role |
| --- | --- |
| `purity-swept.toml` | The ledger. Swept (`[swept]`) and stopped (`[pending]`; the value is **the condition under which it can be removed**) |
| `purity-swept.sh` | The lookup. See below |
| `purity-sweep.prompt` | The procedure. Read when the verdict returns "a purity sweep is needed" |

```sh
.agents/purity-sweep/purity-swept.sh <path>...   # パスごとの判定
.agents/purity-sweep/purity-swept.sh --stat      # 走査対象 / 記帳済み / 保留 / 残量
.agents/purity-sweep/purity-swept.sh --remaining # 未記帳のパスを並べる
.agents/purity-sweep/purity-swept.sh --pending   # 止まっているものを、消せる条件付きで並べる
.agents/purity-sweep/purity-swept.sh --stale     # 台帳に在るが走査対象ではない鍵を並べる
```

The hook only acts on files that are touched, so **the entry point for work that goes through everything is `--remaining`**.

The scan targets are the tracked files minus those that hold no contents of their own. **The declaration of generated artifacts is
held by `linguist-generated` in `.gitattributes`, and the lookup reads it there** — placing a copy on the verdict side
would silently go stale the day a generator is added. The other exclusions (lock files, assets, release records,
submodules, scratch) are declared by `purity-swept.sh`. The individual reason is
answered by `purity-swept.sh <path>`.

**The count reconciliation (scan targets = recorded + pending + remaining) counts only keys that exist among the scan targets.** Counting the ledger's
raw lines would pull in misspellings, paths no longer tracked, and paths that later became generated artifacts, and the reconciliation would
break. Such keys appear in `--stale`. `--stat` prints pending items **by their contents every time**, not as a count —
with only a count, rows nobody can retire pile up and the number merely goes up by one, while the removal conditions go unread.

**This mechanism has a lifetime.** When `--remaining` and `--pending` are both empty, the question it answered
closes. At that point, as the intended end state rather than abandonment, the following three are deleted together.

1. This directory (`.agents/purity-sweep/`)
2. The `PreToolUse` hook definition in `.claude/settings.json`
3. The `Purity Sweep` section of `AGENTS.md`

**Before deleting, move the check this mechanism was standing in for.** Of the three purity questions,
"do not write into a surviving document a premise that expires before that document" ([`docs/rules.md`](../docs/rules.md#comments))
currently has **this pass as its only enforcement**. The moment it is deleted, only review stops the inflow.
It is in a form that can be mechanized, so **place the check in the same change as the removal.**

The ledger is **the result of sweeps**, so an entry added by hand claims "a sweep that never actually happened".
The next reader silently inherits that claim, and the file is never looked at again. Hand-editing is appropriate only
to repair a broken line left by a failed run.

<!-- boilerplate-only:end -->

## `closed-loop/`

Marks **the boundaries between phases of a development window**. What a window is, and why it is neither a session, a commit, nor a PR, is
owned by [0161](../docs/adr/0161-development-window-as-feedback-unit.md); what it is measured for is owned by
[0160](../docs/adr/0160-agent-environment-loop.md).

| File | Role |
| --- | --- |
| `marks.sh` | Marking. Opening and closing windows, and recording phase boundaries |
| `send.sh` | Launches sending. Hands windows that are closed but not yet delivered to an issue |

**A phase boundary exists nowhere except in the workflow that crossed it.** The record keeps every exchange, but
does not know **which phase an exchange belonged to**. So the side that crosses it does the marking — the session hook
(`.claude/settings.json`), the git hook (`.lefthook.yaml`), and the skill itself (calling `marks.sh <name>` within the
`SKILL.md` procedure). The reading side (`scripts/closed-loop/`) does not mark.

Marks land in `tmp/closed-loop/` (untracked). **One file per name, one epoch per line, always appended** —
the reading side can take whichever of the first line, the last line, or the line count the question needs, so **there is no need to decide in advance
which marks may repeat**. Files are split per name because marks are appended from several processes (a git hook firing
mid-session, two sessions sharing one checkout), and appends to a single file
interleave their writes. One epoch per line can be compared without parsing, read from any language, and
has no timezone to mix up.

**The set of mark names is closed.** An unknown name is refused rather than silently creating a file — if a typo
becomes "a mark nobody reads", it stays invisible until someone asks why a phase has no data. Adding a phase
takes three steps, and any one alone is not enough.

1. Add it to the name set in `marks.sh` (`--names` prints the names that can be written). **Adding it is what makes it
   writable**
2. Put it in the order in the reading side's `scripts/closed-loop/phases.ts`. Intervals are formed between adjacent marks **that actually
   exist**, and a missing mark is not filled in by guessing — "if it was not marked, it does not exist"
3. Place the mark on the side that crosses that phase (hook / git hook / skill)

**What opens and closes a window is the hook payload.** What ends one is a human saying "that is done" —
when `SessionStart`'s `source` reports an explicit discard of context, or when `PreCompact`'s `trigger` reports a manual
compaction. `SessionStart` reports automatic and manual compaction without distinguishing them, so a `SessionStart`
compaction is not treated as a boundary, and the manual side is caught with `PreCompact`. `SessionEnd` closes the current window. An unknown
hook or an unreadable payload does not rotate it (the direction of degradation is the common convention above).

**A mark that arrives at a closed window opens the next window.** A commit that lands after a session ended is not a late footnote to
what ended but the start of something, and binding it into the closed window would put marks after
the window's own end, making intervals impossible to compute. Only the two terminal marks are the opposite: a "close" on a closed window is the same fact a second time,
and an "open" marks by the act of opening itself. **"Look-only" paths (listing, diagnostics) do not create windows** — otherwise empty windows
nobody marked would remain in the reports forever.

**Re-measurement is run by a weekly Actions workflow** (`.github/workflows/closed-loop-weekly.yaml`). [0160](../docs/adr/0160-agent-environment-loop.md) treats observation through re-measurement as one cycle and re-measurement as a phase that cannot be skipped, and **a phase that relies on a human remembering is a phase that gets skipped**. Only the observations written in the issue are read, and the records never leave the local machine (the same ADR's decision to limit reading records to this repository's share). Only folding is triggered explicitly by a human from a terminal — when an unintended fold happens, an unattended run has nobody to notice it.

Findings are **not kept in the repository; the issue tracker holds them** ([0160](../docs/adr/0160-agent-environment-loop.md)'s decision not to keep the authority for findings in the repository). `send.sh` hands over, at session
start, the windows that are closed but not yet delivered — communicating from a session that is about to end would hang somewhere nobody
is watching. A context discard closes the window and triggers `SessionStart` at the same time, so in practice
it is sent almost immediately at every boundary. Sending runs detached in the background, and the absence of `pnpm` and an authenticated `gh` is
not a failure: the window is carried over to the next time, unsent. Only the path that actually sends takes the lock;
`--dry-run` does not touch the index, so it may be looked at even while sending. The destination is derived from the `.git` remote, and no setting
holds a destination.

## `doc-router/`

Names **the documents that govern the path about to be edited**, at the moment of writing. The routing table is
held by [`doc-router/routes.conf`](doc-router/routes.conf), and the `PreToolUse` hook returns only the matching lines.
The format and the constraints on adding lines are stated at the top of `routes.conf`.

**Being incomplete is not a defect.** For a path with no entry it prints nothing, and you trace from the index as usual
(`--hook` adds nothing for an unmatched path; only when called directly with arguments does it print one diagnostic line
saying nothing matched). Only **a wrong entry** is a defect — if it points at a nonexistent document, the reader reads the one
document named and concludes "that was enough". The existence of the targets, the shape of the lines, and duplicate globs are
checked by `scripts/doc-router.gate.test.ts`.

**The nearest README is not listed.** Putting in the table what can be derived by walking upward makes the table and the tree both
answer the same question, and only one of them goes stale. Only destinations that walking does not reach are listed.

A glob is matched as a shell `case` pattern against the repository-root-relative path. **`*` crosses separators**,
so `src/app/*/layout.tsx` matches at any nesting depth, and `*.test.ts` matches anywhere.
When several lines match one path, all of them are returned.

The envelope of the returned text follows the common convention above — the routing-table values are made to declare themselves data, and the single sentence that acts as an instruction
is placed after them in the tool's own words.

## Related ADRs

The decisions the mechanisms here follow. **Shell comments do not point at ADRs directly; they trace this section**
([docs/rules.md](../docs/rules.md#comments)).

- [0159](../docs/adr/0159-script-structure.md) — the exception that keeps what is called from hooks in shell, and putting the main body in `scripts/`
- [0160](../docs/adr/0160-agent-environment-loop.md) — what is measured for / where marks live / how far records may be read
- [0161](../docs/adr/0161-development-window-as-feedback-unit.md) — that the unit is the window, and that marks come first and records are a supplement

## About Editing

`AGENTS.md`'s `AI Modification Scope` enumerates the paths agents may touch, and this directory is not in
that list. **Unless the user instructs it, or a procedure that targets this directory is running, do not create, change, or delete anything under `.agents/`.**

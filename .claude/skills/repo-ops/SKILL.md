---
name: repo-ops
description: Operational runbook for this repository's recurring, easy-to-trip-on gotchas around the mise-managed toolchain, the pnpm lockfile, the Makefile setup targets, the scratch directories, and the lefthook git hooks. Read-only knowledge skill — it tells you the exact command to run; it does not silently mutate state. This is deliberately a SPARSE STARTER for the Next.js boilerplate: it carries only the gotchas that genuinely exist today (mise / pnpm / make DRY_RUN / scratch paths / lefthook hooks), and grows as new operational traps are discovered (in contrast to the go-boilerplate original, whose items were mostly Docker / sqlc / DB-runner specific and do not apply here — ADR 0004 no-docker). Triggers: "make install-tools が mise not found で落ちる", "DRY_RUN はどのターゲットで効くのか", "setup-repo を試しに実行したい", "pnpm install --frozen-lockfile が落ちる", "mise.toml を変えた後の反映", "スクラッチ出力をどこに置くか", "commit が commitlint に弾かれる", "hook が command not found で落ちる".
---

# Repo Ops Runbook

Concrete recovery + procedure steps for the operational gotchas that recur in this repo. This is a
**lookup table, not a workflow**: find the symptom, run the fix. When a step is destructive or touches a
root file, say so to the user first per `CLAUDE.md`.

> **Scope note.** This runbook is intentionally sparse. The go-boilerplate `repo-ops` it was adapted
> from centred on Docker tool-runners, `sqlc` / `schema.gen.sql`, root-owned generated dirs, and a
> live DB — **none of which exist here** (ADR 0004 no-docker; no DB; presentation layer only). Only the
> genuinely-present traps are listed below. Add an item when a new one bites — do not port the
> Go-specific ones back in.

## 1. `make install-tools` fails with `mise not found`

`make install-tools` runs `mise install`, which reads `[tools]` from `mise.toml` (ADR 0003). It first
checks that `mise` itself is on `PATH` and exits with a message if not.

Fix: install `mise` (see <https://mise.jdx.dev/>), then re-run.

```bash
make install-tools     # installs Node.js + pnpm per mise.toml, then prints both versions
```

Rule of thumb: **mise is the SSOT for Node.js / pnpm versions.** After anyone changes `mise.toml`
(e.g. a `node-upgrade`), run `make install-tools` to bring the local toolchain in line, and confirm
with `node --version` / `pnpm --version`.

## 2. `DRY_RUN` does nothing on `make setup-repo`

`DRY_RUN=1` gates only the two replacement helpers. `make setup-repo` never reads it, so there is **no
way to preview** what it will do.

```bash
DRY_RUN=1 make setup-replace-license-copyright COPYRIGHT_HOLDER='Example Inc.'  # preview
DRY_RUN=1 make setup-replace-repository-reference REPOSITORY=org/app           # preview
DRY_RUN=1 make setup-repo                                                      # ⚠️ runs for real
```

`1` is the only value that enables the dry run; anything else (including `DRY_RUN=0`) writes.

`make setup-repo` is a one-time repository-initialization target and is **destructive**: it deletes
every existing tag locally and on `origin`, deletes every release note except `v0.0.0.md`, removes the
`upstream` remote, and creates + pushes `v0.0.0` and the three protected branches. Confirm with the
user before running it, and never run it against an already-initialized repo (it aborts if `v0.0.0`
exists).

## 3. `pnpm install --frozen-lockfile` fails — lockfile out of sync

Per ADR 0001, `pnpm-lock.yaml` **must be committed** and kept in sync with `package.json`. A CI-style
`--frozen-lockfile` install fails when they diverge (e.g. a dependency was edited without re-locking).

Fix: re-lock and commit the lockfile in the same change as the `package.json` edit.

```bash
pnpm install                 # updates pnpm-lock.yaml to match package.json
git add package.json pnpm-lock.yaml
```

Rule of thumb: **any change to `package.json` dependencies requires committing the regenerated
`pnpm-lock.yaml` alongside it.** (`package.json` is a protected root config — dependency edits need an
explicit user instruction; per Toolchain-0005, a dependency *major* goes in its own PR.)

## 4. biome: `pnpm lint` vs `pnpm fix` (ADR 0002)

biome is the single formatter/linter (ESLint / Prettier are not used — ADR 0002). Two entry points:

```bash
pnpm fix       # biome check --fix : auto-fix what can be fixed
pnpm lint      # biome check       : report remaining errors (fix these by hand)
pnpm format    # biome format --write : formatting only
```

`noConsole` is `warn` by default — **do not leave `console.log` in commits** (AGENTS.md / ADR 0002).
Fix items the auto-fixer cannot handle by hand; do not sprinkle `// biome-ignore` (prefer a scoped
`overrides` in `biome.json`, which is a protected root config = user instruction).

## 5. Scratch output belongs under `tmp/`, and stays out of git

`/tmp` and `/.claude/worktrees/` are ignored by `.gitignore`, so the following never reach
`git status`:

- `tmp/reviews/` — `full-verify` / `full-apply` finding sets
- `tmp/<name>.md` — symlinks to work-plan documents whose real files live outside the repo
- `.claude/worktrees/<name>/` — worktrees an agent creates inside the repository

These are scratch output, not source: do not force them in with `git add -f`. A scratch file that
must survive belongs outside the repo, referenced through a symlink under `tmp/`.

## 6. A commit or push is rejected by a hook (lefthook)

Hooks are declared in `.lefthook.yaml` (ADR 0151) and are **not** registered by `pnpm install` —
`pnpm exec lefthook install` must be run once after cloning. Hooks live in the common git dir, so a
worktree inherits them; what a worktree does **not** inherit is `node_modules`, so run `pnpm install`
in it or every hook fails with `command not found`.

| Stage | Command |
| --- | --- |
| pre-commit | `pnpm lint:ci`, plus `pnpm md-lint` when `*.md` is staged |
| commit-msg | `make commitlint COMMIT_MSG_FILE={1}` |
| pre-push | `pnpm typecheck` |

A commit-msg failure means the subject is not `<Prefix>: <subject>` with one of the 11 prefixes of
ADR 0150, the subject is empty, or it ends with `。`. `commitlint.config.ts` deliberately omits
`type-case` — the prefixes mix `Feat` and `CI`, so no single case rule fits. Merge and revert commits
are skipped by commitlint's default ignores.

To check a message without committing:

```bash
echo "Feat: 説明" | pnpm exec commitlint
```

## Constraints

- ✅ Read-only knowledge: surface the exact command; run it only when the user asked you to perform the
  operation.
- ✅ Warn before destructive steps (tag/branch deletion in §2) per `CLAUDE.md`.
- ✅ Confirm with the user before editing root files (`biome.json` in §4, `package.json` in §3) —
  they are outside the default AI Modification Scope.
- ❌ Do not port the go-boilerplate Docker / sqlc / DB items here — they do not apply (ADR 0004).

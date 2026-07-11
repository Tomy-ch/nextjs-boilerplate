---
name: repo-ops
description: Operational runbook for this repository's recurring, easy-to-trip-on gotchas around the mise-managed toolchain, the pnpm lockfile, the Makefile setup targets, and the review-artifact directory. Read-only knowledge skill — it tells you the exact command to run; it does not silently mutate state. This is deliberately a SPARSE STARTER for the Next.js boilerplate: it carries only the gotchas that genuinely exist today (mise / pnpm / make DRY_RUN / tmp-reviews), and grows as new operational traps are discovered (in contrast to the go-boilerplate original, whose items were mostly Docker / sqlc / DB-runner specific and do not apply here — ADR 0004 no-docker). Triggers: "make install-tools が mise not found で落ちる", "DRY_RUN=0 なのに dry-run になる", "pnpm install --frozen-lockfile が落ちる", "mise.toml を変えた後の反映", "tmp/reviews が git に乗る".
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

## 2. `DRY_RUN=0 make <target>` is STILL a dry-run

The Makefile setup targets gate dry-run on `$(if $(DRY_RUN),--dry-run,)`, which treats **any non-empty
value as truthy** — so `DRY_RUN=0 make setup-repo` still runs in dry-run mode. To actually run, **omit
the variable entirely**; to preview, set it to anything.

```bash
make setup-repo            # real run (variable omitted)
DRY_RUN=1 make setup-repo  # dry-run preview
DRY_RUN=0 make setup-repo  # ⚠️ STILL a dry-run (0 is non-empty = truthy)
```

Note `make setup-repo` is a one-time repository-initialization target: it deletes existing tags and
creates `v0.0.0` + branches. It is **destructive to tags/branches** — confirm with the user before a
real run, and never run it against an already-initialized repo (it aborts if `v0.0.0` exists).

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

## 5. `tmp/reviews/` (full-verify / full-apply artifacts) shows up in `git status`

`full-verify` / `full-apply` write their finding set under `tmp/reviews/`. Next.js's default
`.gitignore` does **not** ignore `tmp/`, so these artifacts appear as untracked and can be committed by
accident.

Fix: ignore `tmp/` (confirm with the user before editing `.gitignore` — it is a root file).

```gitignore
# review / scratch artifacts
/tmp/
```

Until then, do not `git add` `tmp/reviews/**` — it is scratch output, not source.

## 6. No git hooks yet (lefthook pending — BACKLOG G2)

Toolchain-0006 specifies pre-commit / pre-push via **lefthook**, but it is **not yet installed**
(no `.lefthook.yaml`, no devDependency — BACKLOG G2 実装ギャップ). So there is currently **no
commit-msg / pre-commit hook** firing locally: lint/build are enforced by you running `pnpm lint` /
`pnpm build` (and by the `commit` skill's verification step), not by a hook. Do not assume a hook
caught anything. When G2 lands, its hook gotchas belong in this runbook.

## Constraints

- ✅ Read-only knowledge: surface the exact command; run it only when the user asked you to perform the
  operation.
- ✅ Warn before destructive steps (tag/branch deletion in §2) per `CLAUDE.md`.
- ✅ Confirm with the user before editing root files (`.gitignore` in §5, `biome.json` in §4,
  `package.json` in §3) — they are outside the default AI Modification Scope.
- ❌ Do not port the go-boilerplate Docker / sqlc / DB items here — they do not apply (ADR 0004).

# base-branch

Prints, on one line, the name of the branch a feature branch is cut from — the latest release line (`release/vX.Y.Z`).
The implementation behind `make base-branch`.

## The only source is the actual state of origin

The answer is built from `git ls-remote --heads origin 'refs/heads/release/*'`; **local refs are not read.**
Other refs look as if they could answer which branch to cut from, but every one of them returns a stale answer without a warning.

- `refs/remotes/origin/HEAD` is set once at clone time and is not updated by `git fetch` (updating it
  needs `git remote set-head`). The "Main branch" an agent harness presents also reads this ref
- The GitHub default branch is a setting that moves only when someone repoints it, and nothing guarantees it matches the latest release line
- A local `release/*` does not exist unless it has been fetched

Because origin is read directly, the answer does not change even when these have gone stale. git uses the host's credentials,
so this runs on the host (treated the same as `scripts/release`).

## "Latest" is a numeric comparison of versions

`major` / `minor` / `patch` are compared as numbers. The comparison is shared with [`../semver/latest.ts`](../semver/latest.ts),
aligned with the criterion the side that cuts release lines (`scripts/release`) uses to decide the next version — the side that cuts a line and the side that resolves it
never disagree about what "latest" means.

- **It does not choose by commit date.** Hotfixes to older lines and base merges make the date order disagree with the version order
- **It does not choose by string order either.** `v1.10.0` sorts before `v1.9.0`

## It fails when there is none

If origin has no branch of the form `release/vX.Y.Z`, it stops with exit 1 and prints no empty string. The fetch itself
can succeed (none has been cut yet, or the ref format changed), so returning empty as "latest" would let the caller
proceed with an empty base without noticing that resolution failed.

Only `release/*` is in scope; `hotfix/*` is never a candidate. What it resolves is the rule "feature / bugfix branches are cut from the latest
`release/*`"; the branch a hotfix is cut from is decided by a person on the spot.

## Running

| Command | When |
| --- | --- |
| `make base-branch` | When cutting a branch, and when deciding a PR's base. Capture it with `BASE=$(make -s base-branch)` |
| `pnpm exec tsx scripts/base-branch` | The same. Takes no arguments |

If a PR already exists, its `baseRefName` is authoritative; this is the answer for when there is no PR.

## Structure

| File | Role |
| --- | --- |
| [`index.ts`](index.ts) | Entry point. Calls git and prints the answer on one line |
| [`resolve.ts`](resolve.ts) | Decision. Picks the latest release line from the `ls-remote` output |

## Related ADRs

- [0150](../../docs/adr/0150-git-workflow.md) — feature / bugfix branches are cut from the latest `release/vX.Y.Z`
- [0157](../../docs/adr/0157-inspection-declaration-discipline.md) — an unresolvable state is not collapsed into an empty answer
- [0159](../../docs/adr/0159-script-structure.md) — separating the entry point from the decision

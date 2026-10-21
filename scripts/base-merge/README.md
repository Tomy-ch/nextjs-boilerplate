# base-merge

Merges the base branch into the current branch and lists the unresolved paths. The implementation behind `make base-merge`.

It does not own resolution itself. Which class a conflicted path is settled as (regenerate a generated artifact, re-run the
resolver for a pin lockfile, take the union for an append-only registry) is the `resolve-merge` skill's judgment; this tool
owns **the merge and the report, nothing further**. Putting the classification table here would make the table live in two places.

## The PR's `baseRefName` is the strongest source of the base

The first one that decides, in order, is taken.

1. `--base=<ref>` — what a person stated explicitly
2. `gh pr view --json baseRefName` — **authoritative on a branch that has a PR**, because it is where that branch will actually merge
3. The latest release line on origin — only when there is no PR. The decision is shared with
   [`../base-branch/resolve.ts`](../base-branch/resolve.ts)

**`refs/remotes/origin/HEAD` and `gh repo view --json defaultBranchRef` are not read.** Both answer the previous
release line without a warning, and the diff silently widens by one generation as a result. The detailed reasons are owned by
[`../base-branch/README.md`](../base-branch/README.md).

Merging anything other than that base into a branch that has a PR turns what was meant as catching up into **retargeting**. Even when a new
release line has opened, the PR decides where that branch is headed.

**When a hotfix line is involved, do not guess.** The latest-release-line resolution looks only at `release/*`, so it
never names a hotfix. Take `--base=<ref>` from a person.

## Do not rebase

Beyond being a convention of [0150](../../docs/adr/0150-git-workflow.md), a rebase does real damage to append-only files
(registry tables, inventories) — the same content re-lands under a different hash and reads as two independent
additions.

## Two states it refuses

- **On a protected branch** (`production` / `staging` / `develop` / `release/**` / `hotfix/**`) —
  the push after the merge hits 0150's rule against pushing directly to a protected branch. Noticing only after merging
  leaves the working tree stuck in MERGING with nowhere to go
- **A dirty working tree** — conflict resolution and uncommitted local changes mix in the same tree, and it becomes impossible
  to tell afterwards which came from the conflict

## How it ends

| State | Exit code | Output |
| --- | --- | --- |
| Merged | 0 | The merged base on stderr |
| Conflicts remain | 1 | **Unresolved paths on stdout, one per line**, and the count on stderr |

Even when conflicts remain, **the working tree is left in MERGING.** `resolve-merge` continues the resolution, so running
`git merge --abort` here would throw away its input along with it.

stdout carries only paths so that it can be captured with `$(make -s base-merge)`. All guidance goes to
stderr (treated the same as [`../base-branch`](../base-branch/README.md)).

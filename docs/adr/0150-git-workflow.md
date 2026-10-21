# Git Branch and Commit Policy

Defines this project's Git branch strategy, commit conventions, pull request operations and release operations.

Branch protection is enforced mechanically by repository settings (`.github/settings/branch-protection.json` / `.github/settings/work-branch-history.json`); this ADR states their rationale, together with the full set of operating rules people follow day to day, as a "decision".

## Status

Accepted

## Rationale / Purpose

- **Map environments and branches 1:1** so that "which branch is deployed to what" is unambiguous (production / staging / develop)
- **Protect the protected branches mechanically through repository settings**, structurally eliminating accidents such as direct pushes, force pushes and forgotten reviews
- **Align commit granularity and the PR template** to lower the cost of after-the-fact review and of release-note generation (`.github/release/`)
- Codify implicit operations so that "the rails to follow from the start" can be traced

## Branch Structure

### Environment Mapping

| Branch | Deployment environment | Role |
| --- | --- | --- |
| `production` | Production | Code released to production |
| `staging` | Staging | Final verification before going to production |
| `develop` | Development | Integration target for changes in the next release (default PR base) |
| `release/vX.Y.Z` | (no deployment) | Branch gathering the work of one release |
| `feature/*` | (no deployment) | Working branch for adding features |
| `bugfix/*` | (no deployment) | Working branch for ordinary bug fixes |
| `hotfix/*` | (emergencies only) | Emergency fixes for production incidents |

### Branching and Promotion Flow

```text
production  ←(merge)  staging  ←(merge)  develop  ←(merge)  release/vX.Y.Z  ←(merge)  feature/*
                                                                                      bugfix/*
     ↑
     └────────── hotfix/* (branched from production, merged back into production; also brought into develop)
```

| Branch | Branched from | Merged into |
| --- | --- | --- |
| `release/vX.Y.Z` | `production` | `develop` |
| `feature/*` | **the latest `release/vX.Y.Z`** | the `release/*` it branched from |
| `bugfix/*` | **the latest `release/vX.Y.Z`** | the `release/*` it branched from |
| `hotfix/*` | `production` | `production` (+ also applied to `develop`) |

### Key Branching Rules

- `release/*` is **branched from `production`**. Unless it starts from the shipped snapshot, it drags changes not yet shipped into the release version. `develop` is an integration target and is not used as a starting point for work
- `feature/*` / `bugfix/*` are **branched from the current `release/vX.Y.Z`, not from `develop`**
- One `release/*` branch is used per release. Once the release number is settled, the version goes into the branch name (`release/v0.1.0`)
- `hotfix/*` is only for emergency fixes to production incidents. After it is merged back into `production`, it is also applied to `develop` to keep histories consistent

## Protected Branches

`.github/settings/branch-protection.json` mechanically enforces the following on its targets (`production` / `staging` / `develop` / `release/**` / `hotfix/**`).

| Rule | Content |
| --- | --- |
| Pull request required | No direct pushes. Every change goes through a PR |
| Required approvals | At least 1 approve |
| Dismiss stale approvals | A new push automatically dismisses earlier approvals |
| Approval of the last push required | Cannot merge unless the last push carries an approve |
| Review threads must be resolved | Cannot merge with unresolved review comments |
| No force push / non-fast-forward | Rewriting history is forbidden entirely |
| No branch deletion | Protected branches cannot be deleted |
| code quality | A failed check of `errors` severity blocks the merge |
| Allowed merge strategies | `merge` (merge commit) / `squash` |

These are framed not as "followed because the repository refuses otherwise" but as **"locked in by settings because this policy is also right as an operating practice"**. A change that loosens the settings is synchronized with a revision of this ADR.

## Branch Naming Rules

```text
feature/<issue-no>-<kebab-description>   e.g. feature/1234-add-login-form
bugfix/<issue-no>-<kebab-description>    e.g. bugfix/5678-fix-route-handler
hotfix/<issue-no>-<kebab-description>    e.g. hotfix/9012-cache-invalidation
release/v<major>.<minor>.<patch>          e.g. release/v0.1.0
```

- If there is no issue number it may be omitted; use a descriptive hyphen-separated name instead (e.g. `feature/restructure-config`)
- The description part is **lowercase English with hyphens**. No colons, uppercase, spaces or Japanese
- `release/*` always includes the SemVer (down to the patch)

## Commit Conventions

### Prefixes

Every commit subject starts with one of the following prefixes. The format is uniformly **`<Prefix>: <Japanese subject>`**.

| Prefix | Use |
| --- | --- |
| `Feat` | Adding a new feature |
| `Fix` | Bug fix |
| `Refactor` | Internal improvement that does not change behavior |
| `Perf` | Performance improvement |
| `Docs` | Documentation-only change |
| `Test` | Adding or fixing tests only |
| `Build` | Change to the build configuration or dependencies (`package.json` / `mise.toml`, etc.) |
| `CI` | Change to CI / GitHub Actions |
| `Chore` | Other chores (moving files, tidying comments, etc.) |
| `Style` | Formatting that does not affect logic, such as formatter auto-fixes |
| `Revert` | Reverting a commit |

### Message Rules

- The subject is written **in Japanese**. The body is also Japanese by default (English spellings of technical terms are allowed)
- The subject is complete on one line and has no full stop (`。`)
- A commit whose subject alone does not convey the why leaves the background in the body
- **What the body records is the background of the change, not the footsteps of the work.** "It used to be broken" or "fixed X" is already in the diff. Even more so, if it refers to a state you yourself created within the same PR, from the base's point of view that fact never happened. The body is written in the present tense of the state after the change — what ended up in what state, and why it has that shape
- As a rough guide, the subject stays within about 72 characters

#### Scope of Mechanical Enforcement

The commit-msg hook ([0151](0151-git-hooks.md)) mechanically enforces only the following three points.

- The prefix is one of the 11 in the table above
- The subject is not empty
- The subject does not end with a full stop (`。`)

**The rest stays prose guidance and is not mechanically enforced**. Being in Japanese, the 72-character guide, recording the why in the body, and the distinction between background and work footsteps all either depend on subjective judgment or produce false positives when judged mechanically. A hook that gives false positives invites habitual use of `--no-verify`, which disables the three mechanically enforced points along with it. **Widening the scope of enforcement can lower the effectiveness of enforcement**.

**Reversal condition**: when commitlint provides a standard rule that can detect "whitespace only" **without having the subject's shape defined by a regular expression**. The only way to close it today is defining `headerPattern` in `parserOpts` ourselves, and that conflicting with the guidance above — "being Japanese, length and formatting are not mechanically enforced" — is the very reason not to do it. **"An off-convention subject actually slipped in" is not the condition**.

For the same reason, the content of the subject itself (whitespace only, meaningless strings, etc.) is not made a convention. A subject that is only whitespace after `Feat:` passes the current check, but closing that would mean defining the subject's shape with a regular expression, which conflicts with the guidance above. When changing this scope, revise this ADR first and make `commitlint.config.ts` follow it (not the reverse).

Examples:

```text
Docs: ADR 0011 を Type A / Type B 区別で補強
Build: Dockerfile を削除し pnpm 採用方針と整合させる
Fix: route handler の query 取得を Next.js 16 API に合わせる
```

### Principles for Splitting Scope

- **One semantic change = one commit, with one prefix.** When one PR mixes several logical changes, split the commits (e.g. Refactor + Feat, Docs + Fix). If you want to write two prefixes, the unit of splitting is wrong
- Tests may go in the same commit as the implementation they verify (splitting them into a separate `Test:` commit apart from the implementation is not enforced)
- Major dependency updates (major bumps of `next` / `react` / `@biomejs/biome`, etc.) are not mixed into the same commit or PR as other feature changes (consistent with 0004)
- Mass changes caused by the formatter are cut into a separate `Style:` commit so reviewers can focus on the logic diff
- Changes to generated artifacts (`pnpm-lock.yaml`, etc.) are included in the same commit as the change that caused them (the lockfile is not split into its own commit)

## Pull Request Operations

### Template

The following sections of `.github/pull_request_template.md` are kept fixed. A PR is not merged with them left empty.

| Section | Content |
| --- | --- |
| `概要` | What this PR added, changed or fixed (1–3 lines) |
| `変更内容` | The main logical units of the diff as bullets |
| `動作確認方法` | Reproduction steps (e.g. start with `pnpm dev` and confirm X) |

The PR title is also written in Japanese, and related issues / ADRs are listed at the end of the body.

### Merge Strategy

- **Default: merge commit** (`Create a merge commit`)
  - The PR-level boundary remains in history, so after-the-fact reviewers and release-note generation can easily trace "where one change starts and ends"
- **`squash merge` is an exception** — used only when there is a clear need to collapse history into one line (e.g. a PR mass-updating machine-generated artifacts), after stating so in the PR body
- **`rebase merge` is not used** (not allowed by the protection settings either)
- When a new push lands on an existing PR branch, the protection settings automatically dismiss approvals, so request review again

### Flow for Updating an Existing PR Branch

When adding fixes to an approved PR branch, keep to the following order.

1. Fix and commit locally
2. Before pushing, briefly add a comment on the PR saying "what was fixed"
3. Push (stale approvals are dismissed)
4. Ask the reviewers to review again

Rewriting history (force push after `git commit --amend`, `git rebase`) is rejected as a non-fast-forward push — by `branch-protection.json` on protected branches and by `work-branch-history.json` on `feature/**` / `bugfix/**` — so additional fixes are **always stacked as new commits**. The ruleset for working branches holds only the ban on non-fast-forward and not the PR requirement or the deletion ban — so as not to stop automatic deletion after merge or direct pushes before a PR is opened. A force push before a PR is opened is rejected as well — a ruleset cannot tell branches apart by whether a PR exists, and if it were allowed only before opening, nothing would remain to stop it after opening

## Release Operations

1. Decide the next version (`v<X.Y.Z>`) and create `release/v<X.Y.Z>` from `production` (`make branch-patch` / `branch-minor` / `branch-major`)
2. Merge `feature/*` / `bugfix/*` into this branch through PRs
3. When the release content is complete, open a PR `release/v<X.Y.Z>` → `develop` (example title: `Release v<X.Y.Z>`)
4. Add the release notes for that version as Markdown under `.github/release/` (this repository's convention; see the existing files for the format)
5. Promotions `develop` → `staging` → `production` are each a separate PR and follow the protection rules
6. Run `make tag-patch` / `tag-minor` / `tag-major` at the `production` HEAD
   - It computes the next SemVer version from the latest release tag and tags the `production` HEAD
   - It runs `gh release create` with `.github/release/<v>.md` as `--notes-file`, producing the GitHub Release
   - If the corresponding release-note Markdown does not exist, the command fails (to keep tags and Releases consistent)

**The `version` in `package.json` is derived from the release branch name.** `package.json` is placed on the side that
follows what the branch name claims, not on the side that decides the version. When people write both, the shipped version and the claimed version drift
silently. The stamping is done by `make branch-*` in step 1 above, which puts one commit aligning the version on top of the branch it cut (if it
already matches the claim, it writes nothing and creates no commit). Whether the version claimed by a PR's base matches is re-derived by CI
(`package-version`) with the same rule. To fix it by hand, use `make version-stamp`.

**The check reaches only as far as "the branch name and `package.json` agree", not the correctness of the branch name itself.**
That the branch name is one step ahead of the latest tag is guaranteed only at the moment `make branch-*` cuts it; a hand-cut
`release/v9.9.9` is challenged by no one. For the same reason, a hotfix cut in the form `hotfix/<issue>-<desc>` contains
no version, so stamping does nothing and CI returns green as unchanged. A hotfix that should carry a version is
cut with `make hotfix-patch` (`hotfix/v<X.Y.Z>`).

### Hotfix Operations

1. Cut `hotfix/<issue>-<desc>` from `production` (using `make hotfix-patch` gives `hotfix/v<X.Y.Z>`, and the `version` stamping matches that of a release branch)
2. After fixing and testing, open a PR `hotfix/*` → `production`
3. After merging, open a PR applying the same fix to `develop` as well (cherry-pick or an equivalent change)
4. Apply it to `staging` too as needed, resolving the differences among the three environments

## Links to Other Repositories

**Owned by [0159-1](0159-1-cross-repository-references.md).** That the default is to go through `redirect.github.com`, that a plain link is held in reserve, and that the judgment to use one belongs to a human without exception — none of these is within the reach of this ADR (git operating procedures); they apply to every place where a string an agent wrote reaches GitHub.

## Prohibitions

- ❌ Pushing directly to a protected branch (`production` / `staging` / `develop` / `release/**` / `hotfix/**`)
- ❌ Force pushing / non-fast-forward pushing to, or deleting, a protected branch
- ❌ Branching `feature/*` / `bugfix/*` from `develop` / `staging` / `production` (always from the latest `release/*`)
- ❌ Commit messages without a prefix (`update`, `wip`, etc.)
- ❌ Mixing a major dependency update into the same commit or PR as other commits (feature additions / bug fixes, etc.) (Enforcement: Prose — **partly mechanizable**. A PR diff that combines a major version bump in `package.json` with other changes can be rejected from the diff, but no rule exists. Whether the combined changes are follow-ups to the update or a separate feature is decided by the meaning of the change)
- ❌ Rewriting history on an existing PR branch (`commit --amend` + force push, `rebase`, etc.). Additional fixes are always stacked as new commits (Enforcement: `non_fast_forward` in `work-branch-history.json` for `feature/**` / `bugfix/**`, and `branch-protection.json` for protected branches. A local `commit --amend` / `rebase` itself does not show up until pushed)
- ❌ Deleting the PR template sections (`概要` / `変更内容` / `動作確認方法`) or merging with them left empty (Enforcement: Prose — **partly mechanizable**. That the PR body has the three headings with non-empty content could be checked by reading the `pull_request` body, but no rule exists. Whether the content explains the change is decided by reading it)
- ❌ Making English the default for commit and PR messages (Japanese is the default; English spellings of technical terms are allowed)
- ❌ Loosening the branch protection settings (`.github/settings/branch-protection.json` / `.github/settings/work-branch-history.json`) without revising this ADR (Enforcement: Prose — **partly mechanizable**. A check rejecting a PR that deletes rules in either file or lowers numbers without touching the body of `0150` could be written, but no rule exists. Loosening the repository settings directly from the UI does not show up in the files)

## Notes

- Because of the "branch from the latest `release/*`" rule, during periods when several `release/*` branches run in parallel, **which release to target is decided at the issue / PR stage**. If unclear, take the latest `release/*`
- **GitHub's default branch is the latest `release/vX.Y.Z`**. This is so that someone opening the repository sees "the release currently being worked on" first. The default branch is switched to the new `release/*` each time a release is cut
- **Both the branch source and the PR base are the latest `release/vX.Y.Z`.** It is obtained with `make base-branch`, which decides by comparing versions numerically against **origin's live state** (`ls-remote`). **Local references and the default branch are not used as the basis** — `refs/remotes/origin/HEAD` is fixed at clone time and does not move on `git fetch`, and switching the default branch is a manual operation, so both silently go stale while still pointing at an old line. **On a remote with no release line at all, it fails instead of returning an answer** ([0157](0157-inspection-declaration-discipline.md)).
  > Enforcement: `make base-branch`. Both the `commit` and `submit-pr` skills go through this entry point
- **Only the integration PR `release/*` → `develop` may take `develop` as its base.** If a `feature/*` / `bugfix/*` PR points at `develop`, its branch source was mistaken. `develop` is an integration target and is always behind any open `release/*`, so starting from it drags already-landed changes along as diff
- This ADR declares only branch naming, protection targets and commit granularity. The concrete CI job layout (which job runs on which branch) and the details of automatic-deployment integration are handled by [0153](0153-ci-configuration.md)
- **Worktrees are not taken outside the repository; they are placed in `.claude/worktrees/`, and each tool that scans the tree excludes them individually. The reversal condition is when agent tools accept the worktree destination as a setting** — today the destination is fixed, so a convention of placing them outside the repository would only apply to those made by hand, the two styles would coexist, and whether exclusion is needed would become unreadable. **The exclusions growing tedious is not the condition** — the tedium is a matter of reducing it with a check for missed synchronization, separate from where the things actually live

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — the policy of committing `pnpm-lock.yaml` (no manual edits to the lockfile)
- [0004-library-management.md](0004-library-management.md) — granularity of dependency-update PRs (major updates in a separate PR)
- [0151-git-hooks.md](0151-git-hooks.md) — operating policy for the pre-commit / pre-push hooks
- [0153-ci-configuration.md](0153-ci-configuration.md) — CI job layout and required checks

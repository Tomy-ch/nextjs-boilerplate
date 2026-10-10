# Make Command Reference

## Role

`.makefiles/` is the central registry of every `make` target used in this repository. Each `.mk` file groups related
targets by area, and the top-level `Makefile` only `include`s them, so adding a target to an existing area
is complete without editing the top level.

Targets are organized in the following units.

- `.makefiles/github` : GitHub initial setup / releases / labels / ruleset settings / workflow lint / the baseline image store
- `.makefiles/tools` : development tool management (mise) / commit message validation / supply-chain pinning (Actions SHA pins,
  container image digest pins, runner egress) / importing API contracts
- `.makefiles/security` : scanning secrets / dependency vulnerabilities / the code we wrote (SAST, data flow) / the delivered surface (DAST),
  and inventories of suppressions and pin cooldown periods
- `.makefiles/testing` : fast test runs and full runs with coverage / sharded runs / delegating gates by load band /
  capturing and comparing stories and screens / Core Web Vitals / reviewing failed images
- `.makefiles/agents` : silent execution for agent calls, and observing development windows

Application-side commands (`dev` / `build` / `lint` / `typecheck`) are **not** make targets; they
live in `package.json` scripts and run through pnpm ([ADR 0001](../docs/adr/0001-package-manager.md)). Only tests
use `make` as the entry point, to make the two-tier hook / CI execution explicit, and call pnpm scripts internally.

## Conventions

- Target names are hyphen-separated lowercase (`make install-tools`, `make setup-repo`)
- Declare everything `.PHONY` and add a trailing `## <description>` comment so it appears in the `make help` list. `make help` warns about
  `.PHONY` lines without a description comment (a target missing from the list is invisible to users)
- Non-obvious logic goes in `scripts/*.ts`, not inline shell, and runs through `pnpm exec tsx`. Put in TypeScript,
  it falls under `pnpm typecheck` and the biome checks, and brings in no shell differences between environments
- **Do not expand values that come from outside as make variables into recipe lines.** `$(VAR)` is textually substituted before reaching the shell, so
  a value containing `"` or `;` breaks the quoting and runs arbitrary commands. `git check-ref-format` allows both characters
  in branch names, so this is a real input, not a hypothetical one. Pass it as an environment variable with `export <NAME>` and have the receiver
  read it from `process.env`, and the value never goes through shell parsing. **Nothing checks this convention mechanically**
  — `make actions-shellcheck` looks at composite actions' `run:`, and `make shellcheck` looks at tracked
  `*.sh`; neither reads `.mk` recipes
- **Do not put a shell variable bare right before a full-width character.** Writing `echo "…（配信元: $$BRANCH）"` makes the shell eat the
  first byte of the full-width character (`0xEF`) as part of the variable name, expand it to empty, and print a broken byte sequence. Wrap it as
  `$${BRANCH}`. Recipe messages are in Japanese, so the place a variable is inserted is usually next to a full-width character. **Only the display
  breaks and the exit code does not change**, so it easily slips past both checks and human eyes
- One-time repository operation commands (`make setup-repo` and its helpers) go under `.makefiles/github/operation/`,
  separated from developer targets. Targets that **apply** GitHub settings go in `setting/`; targets that change nothing and
  **check** files go in `lint/`
- **GitHub setting declarations live in `.github/settings/*.json`, and `setting/` targets only pass them to the API.**
  Only settings that do not fit into one payload and split across several endpoints (Pages delivery settings) hold values directly in `.mk`,
  with the reason written in a comment. All of them read the current state before writing, and re-running on an already-applied repository changes nothing
- **Boolean toggles passed by users are tested with `$(filter 1,$(VAR))`.** `$(if $(VAR),…)` is an empty-string test, so it
  reads `DRY_RUN=0` as "enabled". This is why the enabled value is uniformly `1` only
- **Do not put `$(shell …)` in a variable definition.** The top-level `Makefile` `include`s every `.mk`, so
  an immediately expanded `$(shell …)` runs no matter which target is invoked. External queries (resolving the load band, getting docker's
  bridge) are done inside recipes. A `$(shell …)` defined with `?=` is deferred until referenced, so it is allowed only for things
  light and side-effect free, like `id -u`
- **Each `.mk` declares the variables it reads itself (`?=` and `export`).** Do not omit them even if a neighboring file declares
  the same name. An implicit dependency on another file's declaration quietly becomes empty just by changing the `include` order. When deliberately
  defaulting to another file's value (the cooldown period reading the Actions quarantine days), write that fact and the reason in a comment
- **Steps that need ordering are chained inside the recipe, not listed as prerequisites.** Prerequisites have no order
  under a `-j` invocation. Call `$(MAKE) a` → `$(MAKE) b` in sequence in the recipe (retake then send), or put it in the recipe body (clear the
  area just before capturing). Starting a process and cleaning it up also stays within one recipe, cleaned up with `trap … EXIT INT TERM`
  — trying to express state spanning life and death through dependencies leaves a server behind after a failed run
- **Derived targets do not copy the recipe; they swap values with target-specific variables.** As in `e2e-maintenance: E2E_PRECHECK := true`,
  keep only one common recipe (start, wait, clean up) and override the environment, the configuration applied, and the precondition checks
  with variables. Holding the same setup twice creates a state where only one copy was fixed
- **For tools whose exit code does not represent success, judge by the generated artifacts.** `storybook build` returns 0 even when the preview build
  fails asynchronously, and passing that tree downstream makes every story wait for `iframe.html` until the limit,
  so a build failure shows up as a timeout of everything. Targets wrapping a build confirm the generated artifacts exist
  (`storybook-static/iframe.html` / `.next/server/app`) before returning success
- **Recipes that call a check tool (lint / scanner) directly check `command -v <tool>` first, and if it is missing,
  point to `make install-tools` and exit 1.** They lean toward "fail if missing" because skipping silently would turn green with the check scope
  shrunk (actionlint silently skips shell checks without shellcheck, so `actions-shellcheck` /
  `shellcheck` fail on their own). If only the directory to scan is missing, printing 🟡 and skipping is fine
- **Do not write a comma directly in the arguments of `$(if …)` / `$(call …)`.** It is the same character as the argument separator, so it splits there.
  Define `COMMA := ,` and insert it with `$(COMMA)` (`--reporter=list$(COMMA)blob`)
- **The silent-execution pattern rule uses the prefix `ai-%`; no other target name starts with `ai-`.** With a suffix like `%-ai`,
  when the stem is already a pattern rule's target the match splits two ways, and the one that loses does not fail but silently
  does something else. `ai-%` matches no literal prefix of other patterns
- **Targets that start a server have their own default port that overlaps no other.** Keep them distinct from the dev server (3000) / Storybook (6006)
  and from each other, and confirm the port is free before starting. With the same port, in an environment where something is already listening,
  "wait for startup" is satisfied by reaching someone else's server, and the tests run against it. When CI runs several
  startups in a row on the same machine, it also passes a different port per stage
- **Targets that run in a container pass `RUNNER_UID` / `RUNNER_GID` from `id -u` / `id -g`.** This writes generated artifacts with the host's
  owner; the compose-side default (1000) is Linux's first user and is not guaranteed to match whoever runs it
- **For scanners that do not read `.gitignore`, state explicitly what to exclude from the scan.** `node_modules` (double-counting the same dependencies
  as the lockfile) and `.claude/worktrees` (the contents of other branches) get scanned unless specified, even though they are ignored
- **Report-only scans and gates are separate targets.** Report-only targets do not fail on exit code, and only CI
  passes `<TOOL>_DETECT_EXIT=1` to receive whether something was detected — if "did not run" and "found something" are the same green,
  whether a comment is needed cannot be decided. This is not a setting that turns report-only into a gate; whether to fail the job is decided by
  the caller. The gate is placed at the single point of promotion (a PR targeting a protected branch) ([ADR 0110](../docs/adr/0110-security-operations.md))
- **Targets that write the same check in a different format hold the check conditions in one place.** Either factor the flags into a variable both
  read (`OPENGREP_FLAGS`), or re-invoke the original target with `$(MAKE) <target> <ARGS>="…"` (`bearer-sarif`).
  If the gate and the Security tab list point at different scans, neither can be trusted
- **Targets that delete themselves are enclosed in markers (the start, such as `sample:begin`, and its matching `end`, written as `#` comments).**
  make reads all makefiles at startup, so even if a script in the recipe deletes its own target from this `.mk`,
  the running recipe continues. Chain the subsequent formatting and checks with `&&` so a failure along the way is not hidden behind the completion message

## Listing Targets

```bash
make help
```

`make help` collects the `.PHONY: <target> ## <description>` lines under `.makefiles/` and prints them grouped by each file's `## <category>` heading.

## `.makefiles/github` Targets

### GitHub Settings

| Command | Description | Notes |
| --- | --- | --- |
| `make gh-login` | Logs in to GitHub with the `gh` command. | Logs in with browser authentication. |
| `make labels-delete-all` | Deletes all existing labels on the GitHub repository. | None |
| `make labels-create-default` | Creates the default labels from `.github/settings/labels.json`. | Reading the declarations and the difference between declared and existing are held by [`scripts/github-settings/labels.ts`](../scripts/github-settings/labels.ts). A label whose name exists is not touched, even if its color or description differs from the declaration. |
| `make branch-protection-apply` | POSTs the rulesets in `.github/settings/` (`branch-protection.json` / `work-branch-history.json`) to the target repository in order. | If the API rejects even one, it prints the full response and stops. The same shape appears when an old `gh` version does not mesh with the API. |
| `make pages-delivery-apply [PAGES_DELIVERY_BRANCH=<branch>]` | Switches GitHub Pages to Actions delivery and allows the delivering branch on the `github-pages` environment. | The default delivering branch is `production`, which must match the push trigger in [`deploy-docs.yaml`](../.github/workflows/deploy-docs.yaml). All three stages read the current state before writing, so running it on an already-applied repository changes nothing. The PUT to the environment is limited to "when it is not yet by-name" because this PUT erases fields not in the body (reviewers, wait time). **Without the permission, `docs-deploy` fails without running a single step** (the job itself starts, so the reason for the failure does not appear in the log). |

### GitHub Repository Initialization

#### `make setup-repo`

Runs the repository initialization right after duplication in one go. It does the following in order. It includes destructive steps,
so always review its contents before running it other than right after creation. If the tag `v0.0.0` already exists, it treats the repository as initialized and
stops without doing anything.

- `gh` login
- **Deleting all existing tags** (both local and `origin`) and creating / pushing the initial tag `v0.0.0`
- Creating the `develop` / `staging` / `production` branches (skipping ones that exist)
- Setting the GitHub default branch and switching to `production`. If the branch it was on at run time is a `release/` one,
  deleting that branch from local and `origin`
- Applying the branch rulesets
- Pages delivery settings (switching to Actions delivery, and allowing delivery from `production`)
- Initializing labels
- **Deleting all release notes under `.github/release/` except `v0.0.0.md`**
- **Removing the `upstream` remote**

#### Setup Helper Commands

| Command | Description | Notes |
| --- | --- | --- |
| `make setup-replace-license-copyright COPYRIGHT_HOLDER=<name> [COPYRIGHT_YEAR=<year>]` | Updates the copyright notice in LICENSE. | The year is optional. |
| `make setup-replace-repository-reference REPOSITORY=<owner>/<repo> [PORTAL_URL=<url>]` | Replaces GitHub repository references, the project name (`name` in `package.json`), and links to the documentation portal with the new repository's. | If `PORTAL_URL` is omitted, it builds the GitHub Pages destination (`https://<owner>.github.io/<repo>/`). Pass it only for a custom domain. `docs/` / `.claude/` / `scripts/setup/` / build outputs (`.next` / `dist` / `build` / `tmp`) / lock files are excluded. |
| `make setup-remove-licensed-scanners` | Removes the three scanners that need credentials (CodeQL / SonarQube Cloud / Dependency Review) together. | **Each product goes into a separate commit.** If you want to keep just one, `git revert` that commit. The working tree must be clean. In addition to the workflow, pin, and destination declarations, **it also drops the lines in the documents that declared them** — tests check that declarations match what exists, so if a line has moved, the removal throws and stops. Removal is a choice, so nothing breaks until you decide (each skips itself and returns green if unconfigured). |
| `make setup-remove-boilerplate-only` | Strips the boilerplate-only text (rules and notes meaningful only to the distributing side). | When stripping finishes, the tool itself is gone too. There is no option to skip it ([0152](../docs/adr/0152-agents-md-policy.md)). <!-- boilerplate-only:line --> |
| `make setup-remove-sample` | Purges the set of screens that carry the sample subject, and runs verification. | **Destructive.** The exit for not carrying sample-specific vocabulary into the side that stays; it confirms the gates pass after deletion. |

Every helper command, given `DRY_RUN=1`, prints only the planned changes without rewriting. The only enabled value is `1`;
anything else (`DRY_RUN=0` or omitting the variable) actually rewrites.

### VRT Baseline Image Store

Baseline images live in a separate repository and are referenced as a submodule from `baseline/images`
([`vrt/README.md`](../vrt/README.md)). The store side has no workflows, so every operation comes from here.

| Command | Description | Notes |
| --- | --- | --- |
| `make setup-baseline-store` | Prepares the store and wires it to `baseline/images`. | It first asks whether to specify an existing repository (organizations sometimes restrict new repository creation by permission). On new creation it also makes the initial commit placing a README. If already wired it rewires, so moving organizations or renaming the repository takes the same command. |
| `make setup-baseline-app` | Registers the GitHub App used for retakes in `BASELINE_APP_ID` / `BASELINE_APP_PRIVATE_KEY`. | Creating the App and generating the key cannot be automated. The App ID is resolved from the slug, so there is no need to note it, and the private key is pasted into standard input, so it stays neither on disk nor in history. |
| `make baseline-prune [DRY_RUN=1]` | Deletes from the store the baseline image sets not pointed to by any live ref. | Irreversible. What prompts running it is the monthly [`baseline-prune.yaml`](../.github/workflows/baseline-prune.yaml), which opens an issue only when the threshold is exceeded. The retention conditions are in [`scripts/baseline-store/retention.ts`](../scripts/baseline-store/retention.ts). |

### GitHub Actions Lint

| Command | Description | Notes |
| --- | --- | --- |
| `make actionlint` | Checks the workflow definitions in `.github/workflows` with actionlint. | Skips if the directory does not exist. |
| `make actions-shellcheck` | Checks the `run:` shells of composite actions (`.github/actions/**/action.yaml`) with shellcheck. | Findings are reported by line and column of `action.yaml`. `shell:` values other than `bash` / `sh` are not checked and are printed as skipped with the location and dialect. |
| `make actions-mise-pin-lint` | Checks that `setup-mise`'s version / digest / cache key agree. | mise's own version cannot be written in `mise.toml`, so the composite action holds the declaration, and because `with:` cannot reference `env:`, the cache key holds the same value a second time. A state where only one was fixed does fail, but far from its cause, so it is checked. A consistency violation is exit 1; a state where the check cannot be made is exit 2. |
| `make actions-comment-secret-lint` | Checks that no secret other than `GITHUB_TOKEN` reaches jobs that post PR comments. | A convention violation is exit 1, and a state where the check itself cannot be made is distinguished as exit 2. |
| `make actions-required-check-lint` | Checks that the contexts registered as required status checks are reported on every PR. | The decision needs two files, the ruleset declaration and the workflow definitions, so actionlint cannot express it. A declaration violation is exit 1, and a state where the check cannot be made is distinguished as exit 2. |
| `make actions-zizmor` | Statically analyzes the definitions of workflows and composite actions with zizmor. | It covers the angles invisible to actionlint / `actions-shellcheck` because they flatten `${{ … }}` before handing to shellcheck (unquoted expression expansion in `run:`, etc.). It fails only on high findings, and suppressions are declared with reasons in `.github/zizmor.yml`. **It runs in 2 stages, one printing all findings and one failing only on high** — `--min-severity` also narrows the display, so with one stage, findings suppressed by severity downgrade would vanish from the output too and "slip through silently". The config file is specified explicitly rather than left to auto-discovery (if it is missed, it shows up not as "zero findings" but as "suppressions not working", which goes unnoticed). Both hooks and CI run with `--offline`. |
| `make issue-field-lint` | Checks that implementation-task issues actually have the template's required fields. | Issues opened by the form and issues opened with `--body-file` owe the same fields, yet only the latter would go unchecked. |
| `make shellcheck` | Checks tracked `*.sh` with shellcheck. | The targets are "things that must run before dependencies are installed and so can only be written in shell" (the ADR 0155 exception). They are not TypeScript, so neither the 1:1 gate nor coverage applies, and they are outside `.github`, so actionlint does not reach them either. Without shellcheck the check scope would silently shrink, so it fails. |

actionlint also checks the shell of `run:` steps through shellcheck, so both binaries are version-pinned in `mise.toml`
([ADR 0003](../docs/adr/0003-version-manager.md)). Run `make install-tools` first.

Composite actions are not included in actionlint's scan (passing `action.yaml` makes it interpret it as a workflow,
which is always a syntax error). Instead, `make actions-shellcheck` handles the `run:` shells, and both together
are run by the pre-commit hook and CI's `actions-lint` job. For what remains on the actionlint side, see
[ADR 0153](../docs/adr/0153-ci-configuration.md).

`make actions-shellcheck` also exits abnormally in any of the following cases. They exist so that it never
turns green with the check scope silently shrunk, and the decision is per file (looking at the total, one file's extraction failure would be hidden by other files' success).

- **The extraction count does not match** — the number of `runs.steps[].run` counted by the parser's own conversion differs from the number actually extracted
  (an action that misspelled `using:` also fails here)
- `runs.using: composite` but `runs.steps` cannot be read as a list
- A `run:` step has no `shell:` / there is an alias with no referent / it is broken as YAML

**Write `run:` bodies as literals (`|`)**. Block folding (`>`) folds adjacent lines into spaces, so
finding positions cannot be mapped back, and the folded lines create syntax not in the source and cause false positives, so it is an error.

`make actions-comment-secret-lint` mechanically checks a convention that must hold because `upsert-pr-comment` copies check logs
as is into public PR comments — **do not pass secrets to jobs that compose bodies** ([ADR 0153](../docs/adr/0153-ci-configuration.md)).
The scan unit is the **job**, not the step, and jobs that go through a local action calling `upsert-pr-comment` internally
are included.

What it searches for references is not ranges of source but **the values of parsed scalars**. Cutting by range would pick up examples written in YAML comments
as real references, an unclosed `${{` would be treated as one expression up to the next `}}`, swallowing
real references in between, and values evacuated to other jobs through aliases would conversely fall out of scope.

What it can detect is only direct references to the secrets context that appear in `${{ }}` expressions. Indirect references read in another job and passed
via `needs.<job>.outputs` cannot be traced statically and pass the check. **The convention is authoritative, and this check is
a regression guard against the convention being broken in the future by a single `env:` line.**

Abnormal exits split two ways.

- **exit 1** — a convention violation (a secret other than `GITHUB_TOKEN` in a posting job, or in a position that reaches the whole workflow)
- **exit 2** — the check itself cannot be made. Not a single workflow is found (run outside the repository root) /
  `jobs:` cannot be read as a mapping / `upsert-pr-comment` is defined but no job using it is
  found (reference identification is broken) / a job calls a reusable workflow (secrets passed to the callee
  via `with:` cannot be traced, so unsupported)

`make actions-required-check-lint` checks, for each context that [`../.github/settings/branch-protection.json`](../.github/settings/branch-protection.json)
makes required, that **there is exactly one job that keeps reporting that name**. An unreported
context leaves merging blocked forever as "waiting for required checks", and the breakage is noticed not on the PR that introduced the cause
but on the next PR that comes up.

It fails on the following 6. Each looks green at the time of registration, and turns unmergeable the moment a PR arrives that does not meet the condition.

- No job declares that name (a job rename is typical)
- Several jobs declare the same name (which result is required is undecidable)
- That workflow does not run on `pull_request`
- `pull_request` is narrowed by `paths` / `paths-ignore` / `branches` / `branches-ignore`
- `types:` is narrowed and does not include `opened` / `synchronize`
- The context name branches at run time (`strategy.matrix` / a reusable workflow call)

Jobs that skip via `if:` are not failed. A skipped job reports `skipped`, and required checks count that as success,
so the reporting itself is not interrupted.

Enumerating workflows and reading down to `jobs:` are held by [`../scripts/lib/workflow-files.ts`](../scripts/lib/workflow-files.ts).
**Re-writing the same judgment per check silently creates a state where only one was fixed**, so it is
shared with `make actions-comment-secret-lint`.

### Base Branch Resolution

Answers what a feature branch branches from, and the base when there is no PR. The decision is held by
[`scripts/base-branch/resolve.ts`](../scripts/base-branch/resolve.ts), and the reason the source is limited to `origin`'s actual state
is held by [`scripts/base-branch/README.md`](../scripts/base-branch/README.md).

Only these two start with pnpm's dependency check turned off (`pnpm --config.verify-deps-before-run=false`). The branch point is
needed before `node_modules` is installed, and since they pull in only node built-ins and modules inside the repository, how fresh the dependencies are does not
change the answer. **The only reason it may be turned off is "pulls nothing from node_modules"**; pulling in a single dependency
breaks it, yet answers keep coming back, so both the imports and the recipe declarations are watched by
[`scripts/verify-deps-bypass.gate.test.ts`](../scripts/verify-deps-bypass.gate.test.ts). When adding a target of the same nature,
add it to this check's list of entry points.

| Command | Description | Notes |
| --- | --- | --- |
| `make base-branch` | Prints the branch name of the latest release line (`release/vX.Y.Z`) on one line. | It reads `origin`'s actual state with `git ls-remote`, so the answer does not change even if the local `refs/remotes/origin/HEAD`, which `git fetch` does not update, is stale, or GitHub's default branch still points at the previous line. "Latest" is a numeric version comparison, not a commit date, using the same judgment as the side that cuts release branches. The output has no decoration, so it can be taken as is with `$(make -s base-branch)`. If there is no release line at all, it exits 1 rather than returning an empty string. If a PR already exists, its `baseRefName` is authoritative; this is the answer when there is no PR. |
| `make base-merge [BASE=<ref>] [DRY_RUN=1]` | Merges the base branch into the current branch and prints unresolved paths one per line. | The base is the first one decided in the order `--base` → the PR's `baseRefName` → the latest release line. On a branch with a PR, merging anything other than that base turns what was meant as catching up into retargeting. **It does not rebase** ([0150](../docs/adr/0150-git-workflow.md); in addition, in append-only files the same content would re-land with a different hash). It refuses on a protected branch and with a dirty working tree. If conflicts remain it exits 1, and **leaves the working tree in MERGING** — `resolve-merge` continues the resolution, so discarding it here would lose its input along with it. It holds no classification or resolution ([`scripts/base-merge/README.md`](../scripts/base-merge/README.md)). |

### Release Branches

All of these include irreversible operations (pushing to `origin` / repointing the default branch). The judgment of what to run in which order
is held by [`scripts/release/branch.ts`](../scripts/release/branch.ts), and the targets
only call the entry point.

| Command | Description | Notes |
| --- | --- | --- |
| `make hotfix-patch` | Creates a hotfix branch from `production` and sets it as GitHub's default branch. | Advances patch by one from the current latest tag. If a branch with the same name already exists, or the working tree is dirty, it exits without doing anything. |
| `make branch-patch` | Creates a branch for a patch release from `production` and sets it as the default branch. | Advances the patch version from the current latest tag. |
| `make branch-minor` | Creates a branch for a minor release from `production` and sets it as the default branch. | Advances the minor version from the current latest tag. |
| `make branch-major` | Creates a branch for a major release from `production` and sets it as the default branch. | Advances the major version from the current latest tag. |

### Version Stamping

The version has one source, the release branch name (= the next version counted from the tag), and `package.json` sits on the side derived
from it. Stamping runs inside the branch-cutting procedure (above), so you normally do not invoke these directly.
The judgment of what to write and what to drop is held by [`scripts/package-version/version.ts`](../scripts/package-version/version.ts).

`REF` is not expanded into recipe lines; it is passed to the script as the environment variable `PACKAGE_VERSION_REF` (for the reason, see
Conventions above). How an omitted `REF` is handled (`GITHUB_REF_NAME` → the local current branch) is held by the script.

| Command | Description | Notes |
| --- | --- | --- |
| `make version-stamp [REF=<ref>]` | Rewrites `version` in `package.json` to the branch name's version. | For refs other than `release/vX.Y.Z` / `hotfix/vX.Y.Z` it does nothing and exits normally. It does not commit. |
| `make version-stamp-commit [REF=<ref>]` | Does the same stamping, and commits **only when a rewrite happened**. | Used by the release-branch-cutting procedure. Going on to commit when it already matches the claimed version would make `git commit` fail with an empty stage, stopping the procedure just short of push. |
| `make version-stamp-check [REF=<ref>]` | Checks that `version` in `package.json` matches the branch name. | Does not rewrite. Fails on mismatch (the `package-version` job runs it passing the pull request's base). |

### Release Tags

The decision is held by [`scripts/release/tag.ts`](../scripts/release/tag.ts). Choosing the latest tag to base on is handled in one place by
[`scripts/semver/latest.ts`](../scripts/semver/latest.ts), which can also be invoked as `pnpm exec tsx scripts/semver latest`.

| Command | Description | Notes |
| --- | --- | --- |
| `make tag-patch` | Creates a tag advancing the patch version by one and creates a GitHub Release. | Based on the current latest tag; uses `.github/release/<version>.md` for the release notes. Without the note it creates neither the tag nor the Release. |
| `make tag-minor` | Creates a tag advancing the minor version and creates a GitHub Release. | Based on the current latest tag. |
| `make tag-major` | Creates a tag advancing the major version and creates a GitHub Release. | Based on the current latest tag. |

## `.makefiles/tools` Targets

### Tool Version Management

| Command | Description | Notes |
| --- | --- | --- |
| `make install-tools` | Installs the `[tools]` of [`mise.toml`](../mise.toml) in one go. | mise must be installed beforehand. What gets installed is authoritative in `mise.toml` and not copied here. Every entry states its backend explicitly ([ADR 0003](../docs/adr/0003-version-manager.md)). |

### Commit Message Validation

| Command | Description | Notes |
| --- | --- | --- |
| `make commitlint [COMMIT_MSG_FILE=<path>]` | Validates the commit message with commitlint. | Called from the commit-msg hook in `.lefthook.yaml`. When `COMMIT_MSG_FILE` is omitted it targets the commit message being edited. Its location is not hard-coded as `.git/COMMIT_EDITMSG` but looked up with `git rev-parse --git-path COMMIT_EDITMSG` — in a worktree, `.git` is a file and the real one is on the main checkout's side. For the conventions see [ADR 0150](../docs/adr/0150-git-workflow.md) |

### API Contract Import

The contracts are canonical in the upstream repository; this side only fetches and generates ([ADR 0072](../docs/adr/0072-api-type-generation.md)).

| Command | Description | Notes |
| --- | --- | --- |
| `make api-fetch [NAME=<name>]` | Fetches contracts from the coordinates in `openapi/sources.yaml` and stamps the blob SHA. | Requires `gh` authentication. Omitting `NAME` fetches everything in `sources.yaml`. |
| `make api-gen` | Generates types / zod / MSW handlers from the fetched contracts. | Applies formatting right after generation. If formatting were a separate step, a merely generated state would be committed, and the drift gate would fail not on "forgot to generate" but on "forgot to format". |
| `make api-gen-check` | Verifies that the contracts and generated artifacts are at matching versions (does not generate). | For CI / hooks. |

### GitHub Actions SHA Pins

Leaving `uses:` on a moving tag silently changes what CI runs the moment upstream moves the tag.
To prevent this, references are pinned to commit SHAs, and the tag → SHA mapping is held by `.github/actions-pin.toml`
([ADR 0153](../docs/adr/0153-ci-configuration.md)). **The SSOT for the version is the comment tag at the end of the `uses:` line**,
not the SHA on the `@` side.

| Command | Description | Notes |
| --- | --- | --- |
| `make actions-pin-resolve [ACTIONS_PIN_MIN_AGE_DAYS=<days>] [ACTIONS_PIN_ALLOW_MOVED="<key>..."]` | Resolves comment tags to SHAs with `git ls-remote` and regenerates the lockfile. | The only one of the three that goes out to the network. The default quarantine is 14 days. If a tag declared immutable resolves somewhere new, exit 1 (below). If you hit the GitHub API rate limit, set `GITHUB_TOKEN` (or `GH_TOKEN`). |
| `make actions-pin-apply` | Rewrites `@<sha>` in `uses:` from the lockfile. | Comment tags are kept. |
| `make actions-pin-check` | Checks that `uses:` is pinned exactly as in the lockfile. | Does not rewrite and does not go out to the network. Run by the pre-commit hook and CI's `actions-pin` job. Detects unregistered references / unpinned or mismatched SHAs / a broken lockfile / entries no longer referenced / uninterpretable `uses:` notation and exits 1 (fail-closed). |
| `make egress-apply` | Applies `.github/egress.yaml` to the workflows' harden-runner. | Outbound traffic to anything but the allowed destinations is blocked (`egress-policy: block`). **Base additions on measurement** (the `domain resolved:` lines that `audit` recorded). For workflows whose record is incomplete, keep them at `audit` on the declaration side, with the reason and the condition for removal written. |
| `make egress-check` | Checks that the workflows are pinned as declared. | Does not rewrite and does not go out to the network. Run by the pre-commit hook and CI's `actions-lint` job. Detects differences from the declaration / unexpected content / entries no longer referenced and exits 1 (fail-closed). |

Write `uses:` in **block notation, one step per line**. YAML flow mappings
(`- {name: X, uses: owner/repo@v1}`) are outside the check's net, so they are an error rather than slipping through.

`ACTIONS_PIN_MIN_AGE_DAYS` is the supply-chain quarantine window. If the resolved target is younger than the given number of days since publication, an existing pin
is kept, and if there is none, adoption is deferred. It is a grace period for not taking in a freshly published (possibly compromised) release before upstream detects and
withdraws it. Passing `0` disables the quarantine.

The age the quarantine looks at is the **newer** of the Release's `published_at` and the commit date. A Release is only
tied to the tag name and does not move when the tag is moved, and the commit date can be written arbitrarily by the publisher, so neither alone represents how
new the resolved target is. Even taking the newer one, however, **the quarantine is a mechanism that buys time against automated takeovers,
not a guarantee that withstands forged dates**. Detecting the tag move itself is handled by the fail-closed behavior below.

#### Detecting tag moves

`make actions-pin-resolve` **exits 1 the moment a tag declared immutable resolves somewhere new, and does not write the lockfile**
(it writes nothing at all, including approved moves and other entries). Once a moved SHA enters the lockfile,
`make actions-pin-check` would keep answering "consistent" from then on.

Only **a bare major number like `# v6` is treated as moving** (allowed to advance). `# v6.1.0` / `# v6.1` / `# main`
are all treated as immutable, and fail if their target moves. If upstream has a moving minor tag like `v6.1`, this is a false positive,
but an error in that direction only costs a stop.

If the update is intended, approve it by listing the lockfile keys separated by spaces.

```bash
make actions-pin-resolve ACTIONS_PIN_ALLOW_MOVED="actions/cache@v6.1.0"
```

An approval is given for one move. Leaving a key that did not move in the approval would silently pass the next move,
so in that case it prints "the approval was not needed". The quarantine applies independently even when approved.

The detection's failure output does not build an approval command with the keys embedded. The keys are listed one per line above, so list
only the ones you approve yourself.

The update procedure is held by the `actions-pin` skill.

> Rationale: [0153](../docs/adr/0153-ci-configuration.md)

### Container Image Digest Pins

A registry tag can point to different contents under the same name. Leaving `image:` / `FROM` / `uses: docker://` on
a tag pulls new contents without noticing that the target was replaced. So references are pinned to
digests, and the `image:tag` → digest mapping is held by `docker/images-pin.toml`. **The SSOT for the version is the
tag side**, not the digest. The scan targets are `docker-compose*.{yml,yaml}`,
`docker/<purpose>/Dockerfile`, and `uses: docker://<image>:<tag>` in `.github/workflows/**` / `.github/actions/**`.

The last one is a `uses:` line, but it references a registry, so this mechanism pins it rather than actions-pin, which handles SHA pins
(actions-pin resolves tags to commits with `git ls-remote` and has no effect on registries).
Both mechanisms scan the same files, but the lines they grab do not overlap.

| Command | Description | Notes |
| --- | --- | --- |
| `make images-pin-resolve [IMAGES_PIN_MIN_AGE_DAYS=<days>]` | Resolves tags to digests with `docker buildx imagetools inspect` and regenerates the lockfile. | The only one of the three that goes out to the network (uses docker credentials). The default quarantine is 14 days. |
| `make images-pin-apply` | Rewrites references to `image:tag@sha256:...` from the lockfile. | Tags and trailing comments are kept. |
| `make images-pin-check` | Checks that references are pinned exactly as in the lockfile. | Does not rewrite and does not go out to the network. Run by the pre-commit hook and CI's `images-pin` job. Detects unregistered / unpinned or mismatched / entries no longer referenced / uninterpretable notation and exits 1 (fail-closed). |

Write references **one per line, unquoted, with an explicit tag**. Notations like `image: "alpine:3.24"`, and
`uses: docker://alpine` with the tag omitted (= `:latest`), are outside the check's net, so they are an error
rather than slipping through.

`IMAGES_PIN_MIN_AGE_DAYS` is the supply-chain quarantine window, and the age is taken from the image config's `created`
(for multi-arch, the oldest is taken). An existing pin is kept if there is one; if not, it fails rather than leaving
the tag as is. Allowing tag-only operation would pull unverified digests as is.

**Tag moves are not detected.** A base image's tag normally advances every time a patch version comes out, and
"stop when the target changes" would be indistinguishable from routine updates (this is the one place operation differs from
Actions SHA pins). The defenses that work for images are two: the quarantine and the pin.

## `.makefiles/testing` Targets

| Command | Description | Notes |
| --- | --- | --- |
| `make test-cached` | Runs Vitest using the cache. | Fast feedback for pre-commit. Does not run the coverage gate. |
| `make test-full` | Runs Vitest with the cache disabled and with coverage. | For pre-push / CI. Fails if any of Statements / Branches / Functions / Lines falls below 100%. The human-facing reporter is `dot` — **discarding passes is done by reporter choice, not by filtering text**. A form that picks out failure lines by vocabulary can discard the very reason for a failure as a passing line, whereas `dot` is vitest's own outlet that folds passes into one character, keeping both failure reasons and the coverage table. This keeps log size from growing with the number of passes, and `tail -n 400` covers the whole text. |
| `make test-failures [TEST_RUN=<target>]` | Runs the tests and prints **only the failing cases**. Not a single line is printed for passing cases. | What it reads is vitest's JSON report (`status` / `failureMessages`), not a summarizer that picks out failure lines by vocabulary ([0157](../docs/adr/0157-inspection-declaration-discipline.md)). If everything passes it is one line; on failure, all of them come out with a count. Coverage threshold breaches are not in the JSON, so only when 0 tests failed yet the run failed does it append the tail of the log (the branch is decided only by structured values; it does not read the log's vocabulary). `TEST_RUN` is what to run, defaulting to `test-full`; CI's merging side uses `test-merge`. The report is assembled in only one place, and the exit code is passed through as is from the side that ran. **Do not read `tmp/test-report.json` directly** — it writes every passing case too, measured at 1,100 times the raw text output (785KB against 690B). |
| `make scripts-test-cached` | Runs the helper scripts' (`scripts/**`) suite using the cache. | For pre-commit. Includes the export-to-describe 1:1 gate. |
| `make scripts-test` | Runs the helper scripts' suite with the cache disabled and with coverage. | For pre-push / CI (`scripts-check`). It is separated from the application suite because what lives in `scripts/` is the checking machinery itself, so the reason for a failure is not confused ([0090](../docs/adr/0090-testing-strategy.md)). |
| `make test-shard SHARD=<i>/<n>` | Runs one machine's share of a split, and writes out the blob and its own exit code. | Splitting is only for PR wait time; protected branches and local runs stay on `test-full` (the fixed cost is duplicated per machine, so there is no reason to pay it on runs nobody is waiting for). **Each machine holds no threshold** — a split run sees only the files assigned to it, and lines other machines cover count as unreached. The verdict is made by the merging side. The blob location is under `tmp/`, not vitest's default `.vitest-reports` — **upload-artifact's glob does not pick up names starting with a dot**, so the artifact would be uploaded empty even though the machine wrote it. **It also writes out its exit code and the tail of its log itself** (to a separate area from the blob) — the JSON the merging side reads holds only case results and coverage, so if a machine ended non-zero without recording a single failure, that fact would be left nowhere, and only the check would turn red while stating "all passed". |
| `make test-shards-verify` | Confirms that the results of every machine of the split have arrived (before merging). | Merging with some missing would make tests that did not run show up as insufficient coverage, misidentifying the cause. The machine count is read back from the names each machine wrote. |
| `make test-merge` | Merges the split blobs and verifies the coverage threshold. | After merging, the denominator and reach are the same as running everything on one machine, so **the threshold itself is not loosened**. |
| `make gate-typecheck` | Runs the type check unless the band is `ci-first`. | Called by hooks. When the band is `ci-first`, it prints the workflow name delegated to and the reason, and passes through (delegated to `typecheck.yaml`). |
| `make gate-test-full` | Runs the application tests with coverage unless the band is `ci-first`. | Same as above (delegated to `test.yaml`). |
| `make gate-scripts-test` | Runs the helper scripts' tests unless the band is `ci-first`. | Same as above (delegated to `scripts-check.yaml`). |
| `make load-status` | Shows the local gates' load band and the CPU allocation per window. | The band is decided by measurement ([ADR 0151](../docs/adr/0151-git-hooks.md)). **The output itself is the answer, so it is not wrapped in `make ai-<target>`.** |
| `make build-storybook` | Builds Storybook statically. | The VRT capture target. `make vrt` / `make vrt-update` / `make a11y` call it as a prior stage. `storybook build` returns 0 even if the preview build fails, so it checks that the generated artifacts (`iframe.html` and `assets/`) exist before returning success. When it fails on ENV validation, set `APP_ENV` explicitly. |
| `make a11y` | Runs axe on every story. | Runs in the same digest-pinned container with the same story enumeration as VRT ([ADR 0091](../docs/adr/0091-test-verification-methods.md)). It needs no baseline images, so it does not require the store to be wired. The skip decision looks only at its own record (`tmp/a11y/`) — reusing the record from when the baseline images were captured would, when a retake happens in a state where axe fails, read that state as "matching" from then on and report green. |
| `make vrt [VRT_SHARD=<i>/<N>] [VRT_ARGS=<args>]` | Compares every story with the baseline images. `VRT_SHARD` is which split of the capture targets this is; only CI passes it. | Runs inside a digest-pinned Playwright container ([`vrt/README.md`](../vrt/README.md)). Running directly on the host fails before comparison. If the store is unwired or unfetched, it stops before comparison with a named instruction (running without importing would fail every story with "no baseline image", indistinguishable from a regression). Even on a run that skips the comparison, the first machine (unsplit, or `1/N`) checks the 1:1 correspondence of baseline images and stories — what it counts is the store's files against the full story inventory, which gives the same answer however many machines repeat it. Split runs output the report as `list,blob` — `--reporter` overrides the setting rather than adding to it, and with blob alone nothing remains on standard output, so you could not read which story got stuck. The spec is named so as not to drag the a11y spec into the same run; mixed in, a11y failures would enter the retake set, and the baseline images alone would become approved without retaking fixing anything. |
| `make vrt-retake [VRT_ONLY=<id>,<id>] [VRT_ARGS=<args>] [BASELINE_BRANCH=<branch>]` | Retakes the baseline images and sends them to the store (`vrt-update` → `baseline-push`). | This is the entry point for retaking locally. Capturing without sending leaves the parent's gitlink stale, so the local `make vrt` passes while only CI fails. |
| `make vrt-update [VRT_ONLY=<id>,<id>] [VRT_ARGS=<args>]` | Retakes the baseline images (does not send them to the store). | `VRT_ONLY` narrows the stories to retake by id (fails if 0 match). The same operation on CI is started by the `baseline-retake` label and targets only the stories the preceding run reported. Only for a full run does it clear the area before capturing; **if even one argument is given, it does not delete** — narrowing happens not only through `VRT_ONLY` but also through `--grep` / `--project` in `VRT_ARGS`, so deciding by enumerating narrowing arguments would let an overlooked argument become "delete every story and retake only some". Unknown arguments fall toward not deleting. The hash of the inputs at capture time is written right after capturing — writing it on the sending side would let a tree that fixed the store without capturing record "captured with these inputs", and the next run would skip the comparison. A retake is not approval; the visual judgment is made in PR review by looking at the store's compare view. |
| `make baseline-sync` | Aligns the baseline images' contents with the version the current branch points to. | Called by hooks (post-checkout / post-merge). git does not move the contents when switching branches, so left alone they are left behind by the pointer, and committing that dirt records the wrong pointer. In a working tree that has not imported the store, it does nothing (with `--init` it would fetch the whole store every time a worktree is added, so it only aligns what is there). |
| `make baseline-push [BASELINE_BRANCH=<branch>]` | Sends the retaken set to the store and advances the submodule pointer. | This is the only path that sends to the store. Committing directly inside the submodule would chain retakes together so that cleanup could drop none of them. `BASELINE_BRANCH` defaults to the current branch. |
| `make vrt-gate` | Answers only whether the comparison may be skipped (`run` / `skip`). | **It can only answer after `build-storybook`** — because `storybook-static` is among the inputs that decide the picture, which is also why CI cannot take the form "decide first, then split the capture". |
| `make vrt-record-verified` | Records the hash of the inputs at the point the check passed. | Called by CI. On a split run it writes **after every shard is green** (`vrt.yaml`). Writing earlier would leave a failing state recorded as "passed". There are two records — **at capture** (held by the store in the same commit as the images) and **at the point the check passed** (placed in `tmp/`, carried around by CI via cache). They are separated because even a change that does not alter pictures moves the bytes of `storybook-static`, so with only the capture-time record the window of matches almost closes. It is not kept tracked because it is not the state of the tree but the run history of "that tree was checked". |
| `make vrt-report` | Opens the HTML report of the last run. | Output goes to `tmp/vrt/` (untracked). |
| `make e2e [E2E_ARGS=<args>] [E2E_PORT=<port>] [E2E_HOSTNAME=<addr>]` | Runs the built application in real browsers, runs main journeys, anomalies the browser reports, and per-band rendering differences on 3 rendering engines, and compares per-screen appearance with baseline images. | **The app runs on the host and the browsers in the container** ([`e2e/README.md`](../e2e/README.md)). `node_modules` is resolved for the OS and CPU it was installed on, so `next start` cannot start inside the container. Startup and cleanup are also held by this target. The counterpart must be a mock, and the default `APP_ENV` is fixed to `ci` — the default `local` points at live, so calls that did not state it are not aimed at the real backend. The listening address is narrowed to the one route the container uses to reach it — with the `APP_ENV=ci` this startup uses, the test-only session issuing endpoint is open, so listening on all interfaces would make it reachable from the LAN (Docker Desktop reaches it via loopback, while on Linux the bridge gateway is the destination, so resolution is split by OS). To verify calling the BFF from another origin, a server that returns only documents of the declared origin is started on the same host as the app, and that origin is passed to `HTTP_ALLOWED_ORIGINS` — forging the document inside the browser is not adopted, because Chromium treats a forged document as coming from the public network and blocks fetches to the host with Private Network Access. |
| `make e2e-maintenance [E2E_PORT=<port>] [E2E_HOSTNAME=<addr>]` | Starts the app with `APP_MAINTENANCE_MODE=on` and confirms that every route is replaced with the stopped screen, that the liveness check passes, and that state-changing requests are refused with 503. | It rides the same setup as `make e2e` (build → start → hit from the container's browser → clean up), swapping only the startup environment and the configuration applied. **It does not capture baseline images**, so it does not require the store (submodule). The stop applies to every route and switching requires a restart, so it cannot be mixed into the normal walk-through ([`e2e/README.md`](../e2e/README.md)). |
| `make e2e-metadata [E2E_PORT=<port>] [E2E_HOSTNAME=<addr>]` | Builds and starts the app with `SITE_INDEXABLE=on` and confirms that `robots.txt` allows crawling, that the URLs `sitemap.xml` lists exist and declare themselves as canonical URLs, and that icons and OG images come back as images. | The same setup as `make e2e-maintenance`, but **swapped from the build onward** — because the metadata of statically rendered screens is baked in by build-time configuration ([`src/config/site/site.server.ts`](../src/config/site/site.server.ts)). The externally visible origin is given the app's location as seen from the container, so the URL a screen declares and the URL opened are spelled the same. The not-indexed side is covered by the normal walk-through ([`e2e/README.md`](../e2e/README.md)). |
| `make e2e-update [E2E_ARGS=<args>]` | Retakes the screens' baseline images (does not send them to the store). | Sending is `make baseline-push`. Screen baseline images also go into the `screen/` area of the same store as stories. A retake is not approval. |
| `make e2e-retake [E2E_ARGS=<args>]` | Retakes the screens' baseline images and sends them to the store (`e2e-update` → `baseline-push`). | This is the entry point for retaking locally. The same relationship as `make vrt-retake` on the story side: capturing without sending leaves the parent's gitlink stale. |
| `make e2e-build` | Builds the production build used by screen-level verification. | `make e2e` / `make lighthouse` call it as a prior stage. Invoke it alone when isolating a problem by repeating only startup. Before building it discards `.next/cache/fetch-cache` — results fetched with `cache: "force-cache"` remain there, and on CI those created by another branch's build are restored, so capturing with them left in would make pictures depend not on the state of the tree but on "what the previous build cached". It checks that the generated artifacts (`.next/server/app`) exist before returning success. |
| `make e2e-run` | Starts the app, hits it from the browser, and cleans up on exit. | Likewise called from `make e2e` / `make lighthouse`. This target holds the single set of start, wait, and clean up, so higher targets swap only the environment and the configuration applied. |
| `make e2e-report` | Opens the HTML report of the last run. | Output goes to `tmp/e2e/` (untracked). Traces go to the same place. **It stays resident as a report server, so it is not wrapped in `make ai-<target>`.** |
| `make lighthouse [E2E_PORT=<port>] [LIGHTHOUSE_SHARD=<i>/<n>]` | Opens the screens declared by `e2e/lib/screens.ts` one at a time in Lighthouse and compares LCP / CLS / TBT with the limits in `performance-budget.yaml`. | Startup uses the same mechanism as `make e2e`, and **only the browser runs on the host** — what is compared is numbers, not pixels, so what must be pinned is not font rasterization but the browser version, which `@playwright/test` in the lockfile handles. It needs no baseline images, so instead of the store it confirms that the measuring browser is installed on the host. Each screen is measured several times and the median taken, and the count is held by the same declaration ([ADR 0101](../docs/adr/0101-performance-budget.md)). `LIGHTHOUSE_SHARD` splits across machines, **not across parallel runs on one machine** — what is measured is CPU-bound, so lining them up on the same machine makes them fight over CPU. Splitting is only for PR wait time. Listening is fixed to loopback — listening on the bridge gateway would make the `Host` that the test-only session issuing endpoint sees be that IP, matching none of the allowed destinations, so it returns 404 and screens that need a role cannot be opened. **Do not widen the set of destinations when fixing this** — that set is the line that keeps the damage local if the configuration is published by mistake, and widening it enlarges the exposure of an endpoint that issues sessions with arbitrary roles. |
| `make lighthouse-gate` | Answers only whether measurement may be skipped (`run` / `skip`). | The inputs it counts are the sources, not build outputs, so **it can be asked once, at the stage before splitting machines**. The capture side (`vrt-gate`) asks per machine because it counts `storybook-static`; this side has no such constraint. |
| `make lighthouse-record-verified` | Records the hash of the inputs at the point the budget passed. | Called by CI. On a split run, **the aggregating side, which knows every machine's result**, writes it (`lighthouse.yaml`). |
| `make lighthouse-merge` | Aggregates the results of the split machines and compares them with the budget. | Only the aggregating side holds the verdict. Applying the budget per machine would make a check whose failures change every time the split changes. |
| `make lighthouse-report` | From the LHR the last run left, pulls out elements that moved, how much was pushed down, and heavy scripts. | Output goes to `tmp/lighthouse/` (untracked). **The output itself is the answer, so it is not wrapped in `make ai-<target>`.** |
| `make vrt-review BRANCH=<branch> VRT_ONLY=<id>,<id> [RUN=<run-id>] [VRT_REVIEW_PORT=<port>]` | Lays out the stories CI failed in a Storybook started in a throwaway working tree. | The arguments are written out by the PR comment as one line to copy. **It does not move the local working tree** — it checks out `origin/<branch>` detached into `tmp/review/vrt/<branch>`. Passing `RUN` also downloads `vrt-diff` and serves it on the next port (needs `gh`). What you see here is "why it changed", not pixel equality (it renders with the host's fonts). The entry is separate from the capture side because this one does neither comparison nor retake and needs neither the container nor the store. `VRT_ONLY` / `E2E_ONLY` accept the same sets under the same names as the capture side. |
| `make e2e-review BRANCH=<branch> E2E_ONLY=<name>,<name> [RUN=<run-id>] [E2E_REVIEW_PORT=<port>]` | Lays out the screens CI failed in an app started in a throwaway working tree. | What it starts is **the production build** (because screen baseline images are captured with it). Screens that need a role go through the development session surface with a destination attached. Listening is narrowed to loopback — because with `APP_ENV=ci` the session issuing endpoint is open. |
| `make review-clean` | Cleans up the working trees the two above created, including their git registrations. | Working trees are not removed by Ctrl-C and pile up in `tmp/review/` holding `node_modules` and build outputs. Deleting the directory directly leaves registrations that lost their contents, and the next `git worktree add` is refused there, so clean up through this entry. |

## `.makefiles/security` Targets

Scans for detecting locally the inclusion of secrets, vulnerable dependencies, vulnerable patterns in the code we wrote, and gaps in the delivered surface,
plus inventories of suppressions and pins ([ADR 0110](../docs/adr/0110-security-operations.md)). While dependency scanners ask
"does a library we pulled in have known vulnerabilities", SAST asks "does the code we wrote contain vulnerable patterns",
and DAST asks "is the running app delivering as declared".

Suppressions are limited to `.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml`, recorded with reasons following the suppression policy at the top of each file. **Only `make audit` has no suppression file** — its threshold is "a fixed version exists", so it is built on the premise that if you would suppress it, you could upgrade instead. This premise breaks when upstream pins a vulnerable version exactly.

| Command | Description | Notes |
| --- | --- | --- |
| `make secret-scan` | Scans the range of commits about to be pushed with gitleaks. | Run from the pre-push hook. The target is "commits reachable from `HEAD` that are on no remote"; the dir mode that looks at the working tree is not adopted — it would miss secrets deleted from the working tree after commit (the blob stays in history and gets pushed), and falsely flag gitignored files that are never pushed, inviting habitual hook bypass. If there is no remote-tracking ref at all, the whole history is targeted (widening, not missing). **CI swaps the range with `SECRET_SCAN_LOG_OPTS`** — a PR's branch is on `origin`, so by default the target is 0 commits and it returns green without scanning. On detection it fails with exit 1 (fail-closed). Detected values are not printed thanks to `--redact`, and `--no-color` keeps non-TTY logs from being garbled. |
| `make secret-scan-history` | Scans the whole commit history with gitleaks. | Called only by CI's weekly run. For picking up secrets buried in merged history; scan time grows with the number of commits, so it is not put in hooks (the reversal condition is item 2 of [0110](../docs/adr/0110-security-operations.md)). |
| `make trivy-fs` | Scans dependency libraries for vulnerabilities with Trivy fs. | Manual runs only; **deliberately not connected to hooks**. It does not fail on exit code either. Vulnerabilities cannot be resolved on the spot by whoever is pushing, and their state changes independently of the diff. Blocking is held by the promotion gate ([ADR 0110](../docs/adr/0110-security-operations.md)). **Only CI passes `TRIVY_FS_DETECT_EXIT=1`**, receiving detection as an exit code to decide whether a comment is needed (the local default is 0, so as before it does not fail). `--ignore-unfixed` reports only those with a fixed version, and the suppression file is named with `--ignorefile` rather than relying on auto-detection, confining where it applies to this target. `--skip-version-check` stops trivy's own update-check traffic (the version's SSOT is `mise.toml`). |
| `make trivy-fs-release` | Scans dependency vulnerabilities strictly with Trivy fs before promotion. | The gate CI calls on PRs targeting a protected branch. The only difference from the report-only one above is dropping `--ignore-unfixed`; the severity range is the same. Exit 1 on detection. |
| `make opengrep-rules` | Extracts the SAST rules from the pinned commit. | Runs automatically as a prior stage of `make sast` / `make sast-sarif`. The reason for not pulling from the registry (semgrep.dev) and the extraction method that places no specimens are held by Do not pull SAST rules from a registry in [`.github/workflows/README.md`](../.github/workflows/README.md#do-not-pull-sast-rules-from-a-registry). The pinned values are held by `opengrep-rules-pin.toml` (the same shape as `.github/actions-pin.toml`), and when raising the commit, `pnpm exec tsx scripts/opengrep-rules --resolve --commit <sha>` rewrites it. |
| `make sast` | Checks the code we wrote for vulnerable patterns with opengrep. | **A gate premised on a baseline of 0**; any finding is exit 1. Accepted findings are placed in the source as `// nosemgrep: <rule-id>` with a reason. Kept here as SAST that can be taken outside GitHub, the same command runs locally and in CI. Only hand-written source is targeted, and generated artifacts (the generated client / mock handlers) are excluded — findings in what cannot be edited lead to no action, and if they appear, what to fix is the contract or the generator. `--taint-intrafile` enables intra-file taint tracking (pattern matching alone cannot catch forms where the value's origin is on another line). |
| `make sast-sarif` | Writes out the same check as SARIF. | For import into code scanning. **The check conditions read the same variables as `make sast`** — if the gate and the Security tab list point at different scans, neither can be trusted. After writing, `scripts/sarif` tidies it up — findings suppressed with `// nosemgrep:` remain in SARIF, so unless dropped they pile up only in the Security tab. |
| `make osv-scan` | Looks at dependency vulnerabilities with the OSV database. | Report only. Its sources differ from both Trivy and `pnpm audit`, so the counts do not match. **Only CI passes `OSV_DETECT_EXIT=1`**, receiving detection as an exit code to decide whether a comment is needed (the local default is 0, so as before it does not fail). |
| `make osv-scan-release` | Looks at dependency vulnerabilities with OSV before promotion. | The gate CI calls on PRs targeting a protected branch. Exit 1 on detection. Suppressions are held by `osv-scanner.toml`, and **filtered findings remain in the output with reasons**. |
| `make dast` | Fires HTTP at a running app and checks the delivered surface. | **Only this one reads responses rather than artifacts** — whether CSP and its companion headers are delivered as declared cannot be known by reading artifacts. The target is passed as `DAST_TARGET` (the default is the host's :3000 as seen from the container, because it runs inside a container; CI points at the app started inside the runner, and locally at something started with `pnpm start`). Passive scanning (baseline) is adopted, and the OpenAPI-driven api-scan is not — this layer is the presentation layer and the API is held by a separate repository, so there is effectively nothing to fire at. All file paths are relative to the mount point (the repository root) and do not work from cwd. Known gaps are held by the list in `.github/zap/rules.tsv`, and **findings not on the list are exit 1**. ZAP keeps rules set to `IGNORE` in the output too, so it is distinguishable from silencing. |
| `make bearer-scan` | Looks at the points where values leave the process, together with the classification of those values. | Both opengrep and CodeQL only judge patterns and taint paths by their own conditions, and do not know **that a string reaching the logger is an email address**. **It does not fail.** It tends strongly toward false positives, and fail-closed would drift toward disabling rules one by one (which is forbidden). Findings are sent to code scanning, and GitHub's check turns red what the diff introduced. Paths excluded from the scan are limited to files of "values known not to be secrets", and **individual false positives are absorbed by `bearer.ignore` by fingerprint** — excluding by path would also erase real findings that later enter that file. |
| `make bearer-sarif` | Writes out the same check as SARIF. | For import into code scanning. When there are 0 findings Bearer writes `results: null`, but SARIF has no such value, so `scripts/sarif` normalizes it to an array. Without that, the import is rejected, and "no findings" and "could not report" become indistinguishable. |
| `make suppression-expiry` | Checks suppressions' reversal conditions and fails if any are met or any lack the required form. | CI runs it once a week. **It has two limits, and the report names them.** It can decide only dates, so the output comes with a list of everything, and the surfaces that hold reasons in comments (gitleaks / zizmor / pnpm overrides / sonar) cannot be read per declaration, so only lines containing dates come out. Cooldown exemptions (`minimumReleaseAgeExclude` in `pnpm-workspace.yaml` and `tools-cooldown-ignore:` in `mise.toml`) are read per declaration, and those without a reason, not naming a version, or without a date fail as form violations. Passing `SUPPRESSION_REPORT` from the environment writes out the issue body (it is not expanded into recipe lines). |
| `make tools-cooldown-check TOOLS_COOLDOWN_BASE=<ref>` | Checks whether the pins in `mise.toml` that moved from base satisfy the cooldown period per distribution channel. | CI runs it on PRs passing the base branch. There are two windows by distribution channel — `TOOLS_COOLDOWN_RELEASE_DAYS` (GitHub Releases; the same value as `ACTIONS_PIN_MIN_AGE_DAYS`) and `TOOLS_COOLDOWN_REGISTRY_DAYS` (npm / PyPI); language runtimes (`core:`) are outside the windows. A pin inside the window is exit 1; a pin whose publish time cannot be fetched, or a backend with no channel, is exit 2 (the check cannot be made). An exemption is a `# tools-cooldown-ignore: <理由>。<窓が明ける日> に外す` (reason; remove on the day the window ends) placed directly above the pin ([`scripts/tools-cooldown/README.md`](../scripts/tools-cooldown/README.md)). Without `GITHUB_TOKEN` it borrows `gh auth token`. |
| `make tools-cooldown-audit` | Inventories every pin in `mise.toml` against the cooldown periods. | CI runs it once a week. It can also be run locally. It fails on pins inside the window without an exemption; expired exemptions are watched by `make suppression-expiry`. |
| `make audit` | The dependency audit gate (`pnpm audit`). | Exit 1 if there is even one `high` / `critical` with a fixed version. The threshold is the two of severity and fixability because neither `pnpm audit` nor osv-scanner's call analysis (no JS/TS support) has a reachability filter, and these two are the finest line current tools can draw. The verdict and the table assembly are held by `scripts/audit-gate`. Its counting units and databases differ from Trivy's, so the counts do not match, and **no attempt is made to reconcile them and eliminate the difference** — anything reaching the threshold in either one is treated as blocking ([ADR 0110](../docs/adr/0110-security-operations.md)). |

## `.makefiles/agents` Targets

### Silent Execution

| Command | Description | Notes |
| --- | --- | --- |
| `make ai-<target>` | Runs any target silently and saves its output to `tmp/ai-logs/<target>.txt`. | The default form when an agent calls. It is under the gitignored `tmp/` because that is independent per worktree, with no collisions across windows. On success the output is 0 bytes, the exit code is passed through, and only on failure does it point to the log to read in one line. **The harness hands over only an excerpt on failure and not the file path**, so the hole where truncated lines cannot be recovered precisely when you most want to read the failure is closed at the source of the output. It is not used for **targets whose output is the answer** (`help` / `load-status` / `lighthouse-report`) or **resident targets** (`e2e-report` / `vrt-report`) — the former just becomes unreadable, and the latter never completes, so the caller keeps waiting. |
| `make clean-ai-logs` | Deletes the saved logs (`tmp/ai-logs`). | Logs are kept even on success. As with generators, when "it did not fail, but I want to confirm what happened", being able to read without re-running is cheaper. |

### Observing Development Windows

| Command | Description | Notes |
| --- | --- | --- |
| `make closed-loop-report` | Reports the phase intervals and findings of marked development windows. | Only reads; marks nothing. Marking is done by `.agents/closed-loop/marks.sh` from hooks and skills, and the location is the untracked `tmp/closed-loop/`. **Only deterministic aggregation; no model is used** ([ADR 0160](../docs/adr/0160-agent-environment-loop.md)). When there are 0 windows, it prints that there are 0 rather than "no findings" ([ADR 0157](../docs/adr/0157-inspection-declaration-discipline.md)). |
| `make closed-loop-send` | Sends the findings of windows that are closed but not yet delivered to issues. | **Run `make labels-create-default` once beforehand.** If the `feedback` labels do not exist, `gh issue create` refuses, and windows keep piling up unsent. The destination is derived from the `.git` remote, and no setting holds a destination ([ADR 0160](../docs/adr/0160-agent-environment-loop.md)). Only **windows that are closed and have crossed at least one phase boundary** are sent. Normally `.agents/closed-loop/send.sh` runs it automatically at session start, so you invoke this to flush what was missed by hand. |
| `make closed-loop-send-dry` | Prints only what would be sent. | Sends nothing and does not touch the sent index. It can be looked at even while sending is running. |
| `make closed-loop-weekly` | Aggregates the period's findings, ranks them by score, and re-measures improvements that landed. | **`.github/workflows/closed-loop-weekly.yaml` runs the same thing weekly**, so invoke it by hand when reviewing with a specified period. The default is the last 7 days. Specify the period with `ARGS="--from 2026-09-01 --to 2026-09-07"`. **It only reads; it neither creates nor closes issues.** Re-measurement is a phase that cannot be skipped ([ADR 0160](../docs/adr/0160-agent-environment-loop.md)) — the moment it is skipped, the loop degrades into an accumulator. |
| `make closed-loop-weekly-consolidate` | Does the same, then folds unclosed findings into concerns. | **It creates issues and closes the originals it folded.** Only folding is opt-in because if a side effect were in the default, nobody would notice an unintended fold. |

## Related ADRs

The decisions the targets here follow. **Recipe comments do not point at ADRs directly; they trace this section** —
an ADR's number, section, and the location of its decision all move, but the README moves with its area, so the movement does not ripple into the recipes
([docs/rules.md](../docs/rules.md#comments)).

- [0090](../docs/adr/0090-testing-strategy.md) — separating runs for the application and the helper scripts
- [0101](../docs/adr/0101-performance-budget.md) — how limits are set, and that they are compared against `performance-budget.yaml`
- [0110](../docs/adr/0110-security-operations.md) — audit thresholds / suppression format / never letting findings slip through silently
- [0151](../docs/adr/0151-git-hooks.md) — the local gates' bands, and the responsibilities of the side called from hooks
- [0153](../docs/adr/0153-ci-configuration.md) — checking workflow definitions / how secrets are passed / the character set allowed on public surfaces
- [0155](../docs/adr/0155-claude-skills-development.md) — shell as the exception for what cannot be written in TypeScript
- [0160](../docs/adr/0160-agent-environment-loop.md) — holding only deterministic aggregation, using no model

## Notes

- Adding a target to an existing group file needs no top-level edit. However, adding a **new** `.mk` file requires
  appending an `include` line to the top-level `Makefile` (because it uses individual includes, not a wildcard)
- Release branch / tag targets operate on GitHub's default branch and push to `origin`. Before running them,
  check [ADR 0150](../docs/adr/0150-git-workflow.md)

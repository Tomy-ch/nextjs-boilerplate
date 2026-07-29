# Make Command List

English | [日本語](README.ja.md)

## Role

`.makefiles/` is the central registry for every `make` target in this repository. Each `.mk` file groups
related targets by area, and the top-level `Makefile` only `include`s them — so adding a target to an
existing area needs no top-level edit.

Targets are organized into the following units.

- `.makefiles/github` — GitHub initial setup / release / labels / ruleset / workflow lint
- `.makefiles/tools` — development tool management (mise) / commit message validation
- `.makefiles/security` — secret / dependency-vulnerability scanning

Application-side commands (`dev` / `build` / `lint` / `typecheck`) are **not** make targets: they live in
`package.json` scripts and are run with pnpm ([ADR 0001](../docs/adr/0001-package-manager.md)). `make` covers
only what pnpm scripts cannot — repository operations and toolchain setup.

## Conventions

- Target names are dash-separated lower case (`make install-tools`, `make setup-repo`).
- Every target is declared `.PHONY` with a trailing `## <description>` comment so `make help` can list it.
  `make help` reports any `.PHONY` line missing that comment as a warning — an undocumented target is
  invisible to its users.
- Non-trivial logic lives in `scripts/*.ts` invoked through `pnpm exec tsx`, not in inline shell. Keeping it
  in TypeScript keeps it inside the reach of `pnpm typecheck` and biome, and off machine-specific shell
  behavior.
- One-off repository operations (`make setup-repo` and its helpers) stay under `.makefiles/github/operation/`,
  separate from developer-facing targets. Targets that *apply* a GitHub setting live in `setting/`, and
  targets that *inspect* files without changing anything live in `lint/`.

## Listing targets

```bash
make help
```

`make help` collects the `.PHONY: <target> ## <description>` lines under `.makefiles/` and groups them by the
`## <category>` heading of each file.

## `.makefiles/github`

### GitHub settings

| Command | Description | Notes |
| --- | --- | --- |
| `make gh-login` | Logs in to GitHub with the `gh` CLI. | Browser-based authentication. |
| `make delete-all-labels` | Deletes every existing label on the repository. | None |
| `make create-default-labels` | Creates the default labels from `.github/settings/labels.json`. | None |
| `make apply-branch-protection` | Applies the branch ruleset from `.github/settings/branch-protection.json`. | None |

### Repository initialization

#### `make setup-repo`

Runs the whole initialization of a newly forked repository, in this order. Several steps are
destructive — read the list before running it on anything but a fresh fork.

- `gh` login
- **Deleting every existing tag** (locally and on `origin`), then creating and pushing `v0.0.0`
- Creating the `develop` / `staging` / `production` branches
- Setting the GitHub default branch
- Applying the branch ruleset
- Initializing labels
- **Deleting every release note under `.github/release/` except `v0.0.0.md`**
- **Removing the `upstream` remote**

#### Setup helper commands

| Command | Description | Notes |
| --- | --- | --- |
| `make setup-replace-license-copyright COPYRIGHT_HOLDER=<name> [COPYRIGHT_YEAR=<year>]` | Updates the copyright line of `LICENSE`. | The year may be omitted. |
| `make setup-replace-repository-reference REPOSITORY=<owner>/<repo>` | Rewrites GitHub repository references and the project name (`package.json` `name`) to the forked repository. | `docs/`, `.claude/`, `scripts/setup/`, build output (`.next` / `dist` / `build` / `tmp`) and lock files are out of scope. |

Both helpers take `DRY_RUN=1` to print the planned changes without writing them. `1` is the only value that
turns the dry run on; anything else (including `DRY_RUN=0` and omitting the variable) writes for real.

### GitHub Actions lint

| Command | Description | Notes |
| --- | --- | --- |
| `make actionlint` | Lints the workflow definitions under `.github/workflows` with actionlint. | Skips when the directory does not exist. |

actionlint also checks the shell of `run:` steps through shellcheck, so both binaries are version-pinned in
`mise.toml` ([ADR 0003](../docs/adr/0003-version-manager.md)) — run `make install-tools` first.

### Release branches

| Command | Description | Notes |
| --- | --- | --- |
| `make hotfix-patch` | Creates a hotfix branch from `production` and sets it as the GitHub default branch. | Bumps the patch of the latest tag by one. |
| `make branch-patch` | Creates a patch release branch from `production` and sets it as the default branch. | Bumps the patch of the latest tag. |
| `make branch-minor` | Creates a minor release branch from `production` and sets it as the default branch. | Bumps the minor of the latest tag. |
| `make branch-major` | Creates a major release branch from `production` and sets it as the default branch. | Bumps the major of the latest tag. |

### Release tags

| Command | Description | Notes |
| --- | --- | --- |
| `make tag-patch` | Creates a patch-bumped tag and publishes a GitHub Release. | Based on the latest tag; the release body is `.github/release/<version>.md`. |
| `make tag-minor` | Creates a minor-bumped tag and publishes a GitHub Release. | Based on the latest tag. |
| `make tag-major` | Creates a major-bumped tag and publishes a GitHub Release. | Based on the latest tag. |

## `.makefiles/tools`

### Tool version management

| Command | Description | Notes |
| --- | --- | --- |
| `make install-tools` | Installs the `[tools]` entries of `mise.toml` (Node.js / pnpm / actionlint / shellcheck / gitleaks / Trivy). | mise must be installed beforehand — see [ADR 0003](../docs/adr/0003-version-manager.md). |

### Commit message validation

| Command | Description | Notes |
| --- | --- | --- |
| `make commitlint [COMMIT_MSG_FILE=<path>]` | Lints a commit message with commitlint. | Called from the `commit-msg` hook in `.lefthook.yaml`. With `COMMIT_MSG_FILE` omitted it targets the message being edited. The convention is [ADR 0150](../docs/adr/0150-git-workflow.md). |

## `.makefiles/security`

Local detection of leaked secrets and vulnerable dependencies. These run from the pre-push hook and invoke
the same commands the CI gate will ([ADR 0110](../docs/adr/0110-security-operations.md)).

Suppressions are confined to `.gitleaks.toml` / `.gitleaksignore` / `.trivyignore.yaml`, each entry recorded
with its reason per the policy stated at the top of those files.

| Command | Description | Notes |
| --- | --- | --- |
| `make secret-scan` | Scans the commit range about to be pushed with gitleaks. | The range is "commits reachable from `HEAD` but absent from every remote". Exits 1 on detection (fail-closed). Detected values are withheld via `--redact`. |
| `make secret-scan-history` | Scans the entire commit history with gitleaks. | Catches secrets buried in already-merged history. Grows with the commit count, so it is not wired into a hook. |
| `make trivy-fs` | Scans dependencies for vulnerabilities with Trivy fs. | Reports only the fixable ones and never fails on exit code. Strict judgement belongs to the promotion gate in CI. |

## Notes

- Adding a target to an existing group file needs no top-level edit. Adding a **new** `.mk` file does: the
  top-level `Makefile` includes files individually, not by wildcard.
- The release branch / tag targets act on the GitHub default branch and push to `origin`. Read
  [ADR 0150](../docs/adr/0150-git-workflow.md) before running them.

# Pre-commit / Pre-push Hook Policy

This project adopts **lefthook** as the framework for automatic checks in local development.
The role of hooks is "the first line of defense that keeps a broken state from reaching CI", in a two-tier structure where CI is the authoritative final guard.

## Status

Accepted

## Rationale / Purpose

- Detect lint / format / type errors early and locally, cutting the waiting time caused by CI failures
- Structurally reduce "noticing only after commit / push"
- Make a configuration file (`.lefthook.yaml`) the SSOT for hook behavior, avoiding direct writes to `.git/hooks/` and scattered individual shell scripts
- Make it possible to inherit a state where "the quality gates run from the start"

## Tool Adopted

[lefthook](https://github.com/evilmartians/lefthook) is adopted.

It is installed as an npm devDependency (`pnpm add -D lefthook`). The version is an exact pin (treated as a core dev tool under [0004](0004-library-management.md)).

### Why lefthook

| Aspect | lefthook | husky |
| --- | --- | --- |
| Configuration | One YAML file | A set of shell script files |
| Parallel execution | Supported out of the box with `parallel: true` | Implement it yourself |
| Distribution | A single binary bundled in the npm package | Node scripts |
| Startup cost | Fast, implemented in Go | shell + node |

lefthook is chosen for consolidated configuration and startup cost. The symlinks into `.git/hooks/` are placed with `pnpm exec lefthook install`, making the placement itself reproducible too.

## Division of Responsibilities by Hook Stage

| Stage | Purpose | Expected processing | Speed target |
| --- | --- | --- | --- |
| pre-commit | "Do not put a broken diff into a commit" | Static checks — lint (`pnpm lint:ci` = biome + ESLint boundary checks + reconciliation of boundary declarations. [0002](0002-formatter-linter.md)) / Markdown checks (`pnpm lint:md` = markdownlint + mermaid syntax + semantic checks on `.claude/**`) / checks of workflow and composite action definitions and reconciliation of pins ([0153](0153-ci-configuration.md)) / reconciliation of generated-artifact versions ([0072](0072-api-type-generation.md)) — plus cached tests (`make test-cached`). Each check runs only when its target files are staged | < 5 s |
| commit-msg | "Do not stack off-convention commit messages" | commitlint (validates the 11 prefixes of [0150](0150-git-workflow.md)) | < 5 s |
| pre-push | "Do not push something broken or containing secrets" | Type check (`pnpm typecheck` = `tsc --noEmit`) / full test run without cache (`make test-full`) / secret scan (`make secret-scan` = the range of commits about to be pushed) | < 30 s |
| post-checkout / post-merge | "Do not leave the baseline images' actual content behind what they point at" | Submodule sync (`make baseline-sync`), on every switch and pull | < 1 s |
| post-commit | "Make it possible to say later when the implementation took shape" | A timestamp in the development window ([0161](0161-development-window-as-feedback-unit.md)). It only writes one line to the untracked `tmp/` | < 0.1 s |
| (CI) | Authoritative checks | lint / types / test / build / e2e, etc. | No constraint |

- **There is one biome configuration, and the same rules apply on save, in pre-commit and in CI** ([0002](0002-formatter-linter.md)). Profiles are not split, so a hook never fails with "a finding that did not appear on save"
- biome is implemented in Rust and fast; even a full-file scan including `noImportCycles` (a multi-file scan) measures around 3 seconds, meeting the speed target
- The pre-push commands run in parallel with `parallel: true`. The secret scan is independent of the type check, and serializing them would miss the speed target
- **On a saturated host, gates whose command CI also runs are delegated to CI**. `make load-status` outputs the band, and each pre-push command runs through a `gate-*` target (the implementation is `scripts/load-band/`). What is delegated is the type check and tests; the secret scan always runs regardless of the band (a push is irreversible, and CI has no corresponding workflow)
  - **The band is decided by measured utilization (load average / number of CPUs)**. On a saturated host, **a gate's failure itself becomes untrustworthy** — paths open to failures unrelated to the change, such as contention over intermediate coverage files. Handing it to CI, the authority, is faster and gives the right answer, rather than producing an untrustworthy verdict
  - The band is not decided by the number of working trees. Abandoned old windows would be counted, misjudging an actually idle host as saturated. The window count is used only to compute **the CPU allotment per window** (`LOAD_CPU_SHARE`)
  - **The fact of delegation and its basis are always printed**. Skipping silently leaves an "I thought it was checked"
  - **The configuration is identical in every environment**. In an environment with low parallelism or a single working tree, the band resolves to `full` and every gate runs locally. What this mechanism adapts is only behavior; it does not bake the circumstances of a particular working environment into the configuration
- **The reason the secret scan sits in pre-push** is that once a secret is pushed it becomes an irreversible accident — it "remains on the remote". That **"the range of commits being sent" is settled only at this stage** is also a basis for choosing pre-push. At commit time it is not yet decided whether that commit will eventually be pushed or erased by a later commit (how the scan target is decided is itself owned by [0110](0110-security-operations.md))
- **The dependency vulnerability scan (`make trivy-fs`) is not connected to hooks**. Hooks may carry only checks that "the person involved can resolve on the spot, and whose result is decided together with the change". Dependency vulnerabilities meet neither (they cannot be resolved while waiting on upstream, and their result changes merely because a CVE is published), so reporting is held by PR comments and blocking by the promotion gate (the full judgment is in [0110](0110-security-operations.md))
- The speed target is judged by **steady-state measurements**. Each tool's cold start exceeds the target only the first time, and the target is not loosened on that account

### Design Principles

- **post-checkout / post-merge are not checks.** They do not stop breakage; they only align content git does not move with what the branch records. They are given no room to fail — in a working tree that has not taken it in they do nothing, leaving it to the capture prerequisite check, which points it out by name
- **post-commit is not a check either.** It only records and stops nothing. **A stage boundary exists only on the side that has crossed it**, so the boundary called a commit is stamped here ([0161](0161-development-window-as-feedback-unit.md)). It checks for existence so that it holds in a checkout without the script — the template after stripping — and **always exits successfully**. A failed timestamp is never allowed to stop the work
- **pre-commit prioritizes speed**. Heavy processing (the full test run / `pnpm build` / e2e) is not put in it
- **pre-push tolerates up to medium speed**. There are fewer opportunities to push than to commit
- **CI is the authority**. Hooks are an auxiliary layer for "noticing early"; passing the hooks ≠ a correct state
- **Duplication is intentional**. Running the same lint in hooks and CI is by design, not redundancy

### Why pre-commit does not run the build

The Next.js build (`pnpm build`) takes seconds to tens of seconds even with caching. Running it on every commit makes the hook "in the way" and induces habitual `--no-verify`. The build-equivalent final check is left to CI.

### ESLint Boundary Checks in pre-commit and the Speed Target

Based on the "biome first + ESLint as a complement" policy of [0002](0002-formatter-linter.md), ESLint's layer-boundary checks are **built into pre-commit with glob scoping** as part of `pnpm lint:ci` (targeting only the layers related to the changed files, avoiding a whole-repository scan). If ESLint (the boundaries check with the TS resolver) exceeds the pre-commit speed target (< 5 s), **only the ESLint run may be moved to the pre-push side**. That is an adjustment at the granularity of commands and does not require revising this ADR (see "Modification Rules" below). Raising the speed target itself, however, requires revising the ADR.

## Bypass Policy

### Normal Operation

- **Habitual use** of `git commit --no-verify` / `git push --no-verify` **is forbidden**
- If bypassing is unavoidable, **run the equivalent checks manually right afterwards** (`pnpm lint:ci` / `pnpm typecheck`)

### Exception: Splitting Related Commits

When stacking several logical changes separately within one PR and you "want to temporarily put in an intermediate commit whose logic is unfinished", `--no-verify` may be used on each individual commit.

Provided the following is kept:

- Once all the commits in the PR are stacked, **always pass the hook-equivalent checks locally once** (`pnpm lint:ci && pnpm typecheck`)
- "Intermediate commits may be broken" applies only to the local intermediate state. pre-push runs at push time, so it is ultimately checked

The `commit` skill is the mechanization of this exception. It does not run the hook on each split commit, and at the end it validates by calling each pre-commit command directly, once each. It does not go through `lefthook run pre-commit` because once all commits are stacked nothing is staged, and lefthook skips the commands.

### Exception: A One-Line Commit Derived by a Machine

When committing a value baked in by automation (stamping the version number derived from the branch name), hooks are not run. What lands is one line derived mechanically from a rule, and the checks pre-commit runs have already been passed by the protected branch it was derived from. The reconciliation that re-derives it with the same rule is held by CI.

### Exception: A Gate That Failed for Reasons Outside the Change

A hook failure is evidence about the change only when **the change caused** that failure. The following three are not such cases.

- **Files from another session**. The type check and the full test run read the whole working tree rather than the commit range, so uncommitted files that another window is editing fail the gate for a push that does not contain them
- **Two runs sharing an output location**. When test runs overlap, they delete each other's intermediate files and fail. Nothing is wrong with the code
- **The base branch is already failing**. This can be confirmed by `git switch`ing to the base and running the same gate

In these three, `--no-verify` is correct, and the cause is fixed separately. Changing the shape of the change to satisfy the gate makes the change worse for the sake of a gate it did not break. Two conditions apply, however.

- **Write in the report and the PR which gate failed and why it is outside the change**. An exception taken silently cannot be told apart from skipping a real failure
- **It does not apply to gates where the push itself makes things unrecoverable**. The secret scan cannot take back a pushed secret, and for commitlint the subject is already in history. These two are things to fix, not to skip

Do not pre-run the gates by hand. Running the same check locally again does not make the result any more correct, and on a saturated host that double run itself creates the second failure above. The push is the verification stage.

### Forbidden Bypasses

- ❌ Building `--no-verify` into a shell alias / git alias / IDE default
- ❌ Skipping hook-equivalent checks in CI (CI is the authority and must not be bypassed)
- ❌ Temporarily commenting out commands in `.lefthook.yaml` and committing

## Relationship with CI

| Role | hook | CI |
| --- | --- | --- |
| Behavior on failure | Stops locally | The PR cannot be merged |
| Authority | Auxiliary | Authoritative |
| Where configured | `.lefthook.yaml` | `.github/workflows/` |
| Can be skipped | Can be bypassed (exceptions only) | Cannot be bypassed |

- Hooks and CI call **the same commands** (e.g. `pnpm lint:ci`). Behavior is aligned between local ↔ CI
- Even if hooks are skipped locally, CI catches it, so the final quality guard relies on the CI side
- A state where hooks are "so annoying nobody uses them" is equivalent to running CI alone and is to be avoided. Keep to this ADR's speed targets

## Installation and Initialization

```bash
pnpm install                  # devDependency として lefthook が入る
pnpm exec lefthook install    # .git/hooks/ に symlink を配置
```

Running `lefthook install` automatically in `postinstall` is an option, but to avoid placing unneeded hooks during CI builds, this repository is designed to **call `lefthook install` explicitly**. The steps are to be documented in the README.

## Minimal Configuration

**`.lefthook.yaml` is the single source of truth**. This ADR defines only the skeleton (which stage holds commands of which concern) and does not transcribe the command lines each command actually runs. Transcription only adds places where a copy can drift, and anyone wanting to know a hook's behavior always reads `.lefthook.yaml`.

```yaml
pre-commit:
  parallel: true
  commands:
    <one command per concern>: ...
commit-msg:
  commands:
    commitlint: ...
pre-push:
  parallel: true
  commands:
    <one command per concern>: ...
```

- The responsibilities of each stage, and the checks run there, are defined by the "Division of Responsibilities by Hook Stage" table above
- **1 command = 1 concern**. Do not chain several checks in one `run:`; split them into commands identifiable by name (on failure, lefthook's output shows which check failed)
- pre-commit is `parallel: true`. Do not create ordering dependencies between commands
- **Write every command bare**. Wrapping in `mise exec --` is forbidden entirely by [0003](0003-version-manager.md), and hooks are no exception. Tools are assumed to resolve from the activated PATH; if it fails with `❌ <tool> が PATH にありません`, fix the environment (`make install-tools` + activate), not how the hook is written

### Modification Rules

Concrete commands may be added or updated without revising this ADR (they are adjustments of granularity, not the policy itself). However, the following changes **require revising the ADR**:

- Redefining stage responsibilities (pre-commit / commit-msg / pre-push)
- Relaxing the bypass policy
- Migrating to a tool other than lefthook
- Raising the speed targets (pre-commit < 5 s, pre-push < 30 s)

## Prohibitions

- ❌ Putting heavy processing (`pnpm build` / e2e / the full test run) in pre-commit (Enforcement: Prose — **partly mechanizable**. `pnpm build` / e2e / `make test-full` appearing in a pre-commit `run:` of `.lefthook.yaml` can be rejected by spelling, but no rule exists. Whether other processing is heavy is decided by run time, not by the shape of the configuration)
- ❌ Making `--no-verify` permanent through a git alias / shell alias / IDE setting (Enforcement: Prose — **not mechanizable**. Aliases and IDE settings live in the user's environment and do not appear in the repository's diff)
- ❌ Skipping hook-equivalent checks on the CI side (Enforcement: Prose — **partly mechanizable**. That the entry point each command in `.lefthook.yaml` calls appears in some workflow's `run:` can be checked by reconciliation, but no rule exists. Whether that step actually runs is decided by evaluating `if:` and is known only at run time)
- ❌ Writing shell scripts directly under `.git/hooks/` (via lefthook only) (Enforcement: Prose — **not mechanizable**. `.git/hooks/` is untracked, and writes there do not appear in the repository's diff)
- ❌ Scattering hook configuration (which command runs at which stage) across files other than `.lefthook.yaml` (scripts / Makefile, etc.). Calling an existing entry point such as `pnpm <script>` / `make <target>` in one line from `run:` is not scattering (it is also a requirement for calling the same command locally and in CI) (Enforcement: Prose — **partly mechanizable**. That each `run:` in `.lefthook.yaml` calls an existing entry point in one line can be checked by reading the YAML, but no rule exists. Whether the called script or target takes over the choice of stage is decided by the meaning of its content)
- ❌ Specifying lefthook's own version with a caret (`^`) (exact pin, following the core dev tool policy of [0004](0004-library-management.md)) (Enforcement: Prose — **mechanizable** (check that the `lefthook` value in `package.json` is a complete version with no range specifier. No rule exists))

## Notes

- The policy resolves the dilemma "hooks get in the way when present, accidents happen when absent" with the two tiers of **fast hooks + authoritative CI**
- The concrete content of the lefthook configuration (which command runs at which stage) is adjusted as the repository grows
- The existence of hooks is announced to users in the README (that `pnpm exec lefthook install` is needed)

## Related ADRs

- [0002-formatter-linter.md](0002-formatter-linter.md) — the three stages `pnpm lint:ci` runs in series, and the decision to keep a single biome configuration
- [0004-library-management.md](0004-library-management.md) — the basis for exact-pinning lefthook as a devDependency
- [0110-security-operations.md](0110-security-operations.md) — what the secret scan run in pre-push does, and the judgment not to put the vulnerability scan in hooks
- [0150-git-workflow.md](0150-git-workflow.md) — the commit / PR / release flow after hooks pass
- [0153-ci-configuration.md](0153-ci-configuration.md) — the CI side that runs the same commands as the hooks (hooks mirror CI)

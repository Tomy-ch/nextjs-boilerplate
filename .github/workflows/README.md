# GitHub Actions Workflows

The CI / CD workflow definitions. The source of the design decisions is [ADR 0153](../../docs/adr/0153-ci-configuration.md); this document shows how its implementation is laid out.

**Comments inside workflow definitions are written in English** — both in this directory and in `../actions/` ([0140](../../docs/adr/0140-documentation-operations.md)). The documents under `.github/`, this one included, follow the same model as every other document: an English canonical with a sibling Japanese mirror. What stays Japanese is Japanese output itself — the PR / issue templates, `settings/`, and release notes.

## Trigger Strategy

| Group | When it runs | Role |
| --- | --- | --- |
| CI Checks | Every PR | Stops the merge if lint / typecheck / build / test / startup is broken. **For the three whose cost does not justify one PR (`a11y` / `e2e` / `lighthouse`), only the heavy steps skip** — see "Deferred Checks" below |
| Security | Every PR + a weekly schedule | Makes vulnerabilities in code, dependencies, workflow definitions, and committed secrets visible |
| Deployment | Push to a protected branch | Delivery of build outputs |
| Documentation | Portal delivery | Regenerating and delivering the generated documentation |

The ones that exist are **CI Checks** / **Security** / **Documentation**. Deployment is not placed in this repository, because where the application itself is delivered depends on the use case ([0011](../../docs/adr/0011-no-docker.md)).

## Workflow List (CI Checks)

### Deferred Checks

`a11y` / `e2e` / `lighthouse` **do not run their heavy steps on an ordinary PR**. Execution happens through 5 paths
— promotion PRs (base is `develop` / `staging` / `production`) / pushes to a protected branch / daily / labels
(`run-a11y` / `run-e2e` / `run-lighthouse`) / `workflow_dispatch` — and the decision is held in one place,
[`../actions/check-trigger`](../actions/check-trigger/action.yaml).

**What skips is `if:`, not `on:`.** The job always starts and reports its context. The reason is the same as in
"Do not use `paths:` filters" below: if a context registered as a required check is not reported, the PR is
blocked forever.

The price paid is that detection is delayed by one merge, and what it buys is that "no PR waits for checks whose results
hardly ever move the merge decision". Diffs that should not pay that price are named by `Deferred Checks`.

**However, `e2e` and `lighthouse` also recognize, on their own, the diffs that cannot wait.** Even without matching the 5 paths, if the diff's
structure matches the shapes below, they run without a label. Unlike naming, this is execution, not a recommendation.

| Check | Diffs that run without a label | Why they cannot wait |
| --- | --- | --- |
| `lighthouse` | Screen declarations / layout shells (layout and shell components) | An added screen has no numbers yet to compare against, and waiting delays not just detection but the comparison itself |
| `e2e` | Layout shells (layout and shell components) / the foundation CSS every screen reads / screen declarations | **The path to fix it exists only in the PR.** Baseline image retakes are limited to the set the comparison reported, and the report only appears in the PR's run. If it diverges after merge, there is no longer a PR that can name what to retake |

The line for `e2e` is drawn not at "does it move a screen" but at **"can you tell from the diff that it moves one"**. Mock
responses and journey declarations also move screens, but that is visible to whoever wrote them, so they stay on the label side. For this decision,
even a PR that skips pays about one minute of tooling setup.

**When the decision itself could not be made, it falls toward running.** Being unable to read the diff is not evidence that "the diff is not worth running",
which is the same reading `diff-scope` applies to diffs it cannot read. That it fell this way is left as a
`::warning::` — falling silently would make it indistinguishable, in hindsight, from a run "the diff required".

#### Two reasons for skipping, reported separately

The skip decision has two stages: **deferred** (matched neither the 5 paths of this section nor a shape where the diff decides to run on its own)
and **the diff does not reach it** (`diff-scope` answered that it reaches neither pictures nor journeys). To the reader they are different: the former
gets an answer by waiting for the merge, while the latter produces nothing however long you wait. **The PR comment reports the two separately** —
if both just say "did not run", a PR that should get a label and a PR where a label would be useless look the same.

#### A failure outside a PR becomes an issue

A failure outside `pull_request` (pushes to a protected branch / daily) has no place where its red check gets read.
**It must be turned into something that has an owner, so an issue is opened. One per branch; a second failure comments
on the same issue** — failing again on a branch whose flag is already up is the same single unresolved fact.

`a11y` / `e2e` / `lighthouse` / `vrt-guard` / `baseline-prune` share this shape, and the part that searches and opens is held once,
by [`../actions/upsert-issue`](../actions/upsert-issue/action.yaml). What remains in each workflow
is **the step that assembles the body**, and all it needs to add is the one sentence specific to that check (for axe, "do not turn off a rule
to make it pass").

**The issue is opened even if the body cannot be assembled.** The filing step has `!cancelled()` and does not look at whether the body-assembling
step succeeded. If nothing were done when assembly fails, an empty issue would be opened. So assembly degrades to
fixed text that goes through no tools — this is the last line of defense for a run nobody is watching, and saying
"the body could not be assembled" reaches the reader better than silence.

**Making the body safe is the caller's responsibility.** The issue body is rendered as Markdown, and what flows into it is
tool output — strings this repository did not write — so either indent it by 4 spaces into a code block
or filter it down to a character set that cannot form markup before passing it ([0153](../../docs/adr/0153-ci-configuration.md)).

| Workflow | File | Job name | Contents |
| --- | --- | --- | --- |
| Lint | `lint.yaml` | `lint` | Checks the whole repository except Markdown with biome (full profile) (scope is `files.includes` in `biome.json`) |
| Markdown Lint | `md-lint.yaml` | `md-lint` | Runs markdownlint + mermaid diagram syntax + semantic checks of `.claude/**` (`skill-lint`) |
| Typecheck | `typecheck.yaml` | `typecheck` | Checks types with `tsc --noEmit` |
| Test | `test.yaml` | `test` | Runs Vitest for the application itself (`src` / `docs-viewer` / `tokens` / `mocks`) with a 100% coverage hard gate, and octocov reports coverage, diff, and run time to the PR |
| Scripts Check | `scripts-check.yaml` | `scripts-check` | Runs Vitest for the helper scripts (`scripts/**`) at 100% coverage, and applies the export-to-describe 1:1 gate across the whole repository |
| Build | `build.yaml` | `build` | Checks that `next build` passes |
| Bundle Budget | `bundle-budget.yaml` | `bundle-budget` | Measures, per route, the client JS the browser loads first, and compares it with the limits in `performance-budget.yaml` and the increase from base |
| Dead Code | `dead-code.yaml` | `dead-code` | Detects files / exports / dependencies unreachable from any entry point. `src/components/**` is declared as an entry point, being the surface consumers use, and unused items there are not questioned |
| Smoke | `smoke.yaml` | `smoke` | Starts `next start` and checks that `/` responds |
| Storybook Build | `storybook-build.yaml` | `storybook-build` | Checks that `build-storybook` passes. Vitest imports stories directly so it does not reach addon or builder resolution, and the `vrt` build is "the stage before comparison", so its failure reads as something else. Kept separate from delivery (`deploy-docs`) |
| Purge Verify | `purge-verify.yaml` | `purge-verify` | In a throwaway checkout, purges the sample and checks that formatting, checks, build, and test pass on the purged tree, and that nothing is missing or excess and no dangling references remain |
| Strip Verify | `strip-verify.yaml` | `strip-verify` | In a throwaway checkout, strips the boilerplate-only text and checks that formatting, checks, build, and test pass on the stripped tree, and that not a single marker remains. **It includes itself among what is stripped** (`SELF_DESTRUCT_PATHS` in [`../../scripts/setup/remove-boilerplate-only/manifest.ts`](../../scripts/setup/remove-boilerplate-only/manifest.ts)). Stripping is not optional, so the creating side is left with nothing for it to verify <!-- boilerplate-only:line --> |
| Lockfile Drift | `lockfile-drift.yaml` | `lockfile-drift` | Checks that the lockfile matches `package.json` and that install does not rewrite tracked files |
| Package Version | `package-version.yaml` | `package-version` | Checks that `version` in `package.json` matches the version the PR's base claims. The version has one source, the release branch name (= the next version counted from the tag), and stamping happens inside the procedure in which `make branch-*` cuts the branch. A PR whose base is not a release branch returns green as unchanged |
| Tokens Drift | `tokens-drift.yaml` | `tokens-drift` | Checks that the hand-written token SSOT and the tracked generated CSS match |
| Actions Lint | `actions-lint.yaml` | `actions-lint` | Checks the workflow definitions themselves with actionlint (`run:` shells via shellcheck), composite action `run:` shells with `make actions-shellcheck`, tracked `*.sh` with `make shellcheck`, secret leakage into jobs that post PR comments with `make actions-comment-secret-lint`, mise pin consistency with `make actions-mise-pin-lint`, reconciliation of declared and actual required status checks with `make actions-required-check-lint`, and static analysis of the definitions themselves with `make actions-zizmor` |
| Actions Pin | `actions-pin.yaml` | `actions-pin` | Checks that `uses:` is SHA-pinned exactly as in `.github/actions-pin.toml` |
| Images Pin | `images-pin.yaml` | `images-pin` | Checks that container image references are digest-pinned exactly as in `docker/images-pin.toml` |
| Accessibility | `a11y.yaml` | `a11y` / `a11y-comment` | Runs axe on every story. It rides the same digest-pinned container as the captures, so no extra runner is added ([0091](../../docs/adr/0091-test-verification-methods.md)'s decision to check every story by riding the visual regression run). **Being a real browser, it reaches color contrast** — component tests' `vitest-axe` runs in jsdom and therefore disables contrast. It checks only the one theme that is captured, so violations that appear only in the other theme are not reached ([`vrt/README.md`](../../vrt/README.md)). The job is separated from VRT because if a11y failures entered the retake set, retaking would not fix them while the baseline images alone became approved. The skip decision has 3 layers — **it does not run at all on an ordinary PR** ("Deferred Checks" above), even with a reason to run it skips if the diff does not reach a story, and even if it reaches one it omits axe when the inputs that decide the picture are the same as the last time they passed ([`vrt/README.md`](../../vrt/README.md)). When it fails outside a PR, an issue is opened per branch |
| E2E | `e2e.yaml` | `e2e` / `e2e-comment` | Runs the built application in real browsers. Main journeys, anomalies the browser reports (hydration mismatches / exceptions during rendering / network failures / CSP violations), and per-band rendering differences run on 3 rendering engines, and per-screen appearance is compared with baseline images ([`e2e/README.md`](../../e2e/README.md)). **It looks only at the 3 rendering engines, not at browser brands or versions** — modern browsers ([0102](../../docs/adr/0102-browser-support.md)) collapse, as implementations, into Chromium / Firefox / WebKit, and the version is decided by the digest-pinned image. The app starts on the runner, and only the browsers run in the container (because `node_modules` is resolved for the OS and CPU it was installed on). After the walk-through, a start with delivery stopped (`make e2e-maintenance`) and a build configured to be indexed (`make e2e-metadata`; checks that the public surface — `robots.txt` / `sitemap.xml` / canonical / OG images — holds) run separately. Comparison and commenting are split into separate jobs for the same reason as VRT. **It does not run on an ordinary PR** ("Deferred Checks" above). However, diffs that move layout shells, foundation CSS, or screen declarations run even without a label (the table in the same section). Even with a reason to run, it skips if the diff does not reach a screen |
| Baseline Approval | `baseline-approval.yaml` | `baseline-approval` | Requires the `baseline-approve` label on PRs where baseline images move. It checks not only whether the label is present but that it was applied after the last commit that moved the pointer (an old approval is not carried over to a new set). PR review approval is not used because what is approved is the baseline images, not the whole PR ([`vrt/README.md`](../../vrt/README.md)) |
| VisualRegressionTest | `vrt.yaml` | `vrt-scope` / `vrt-shard` / `vrt` / `vrt-comment` | Builds Storybook and compares every story with baseline images in a digest-pinned Playwright container. Reports stories with differences to the PR as a table, and outputs images as an artifact (`vrt-diff`). A full run also checks that baseline images and capture targets correspond 1:1. The skip decision has 2 layers — if the PR's diff does not reach pictures it skips entirely at the CI entry, and even if it does, `make vrt` checks the hash of the inputs that decide the picture against the value at the time the baseline images were captured, and omits the comparison if they match ([`vrt/README.md`](../../vrt/README.md)). Comparison and commenting are split into separate jobs because, if the baseline store is private, the comparing side holds the App's secret (a job holding a secret must not compose comment bodies). **Capture is split across 4 machines by `vrt-shard`** — cost is proportional to the number of stories, while the 4 cores of one machine are already filled by `playwright.config.ts`, so the only lever to shorten wall time is the number of machines. **The required context is the aggregating `vrt`, not the matrix side** — the matrix reports one by one, as in `vrt-shard (1)`, and a required check cannot name those |
| Deferred Checks | `deferred-checks.yaml` | `deferred-checks` | Leaves a single comment **naming** which of the three deferred checks this PR's diff requires. The decision has 2 stages, **structure first** — which paths call for which label is declared, with reasons, by [`recommend.ts`](../../scripts/deferred-checks/recommend.ts) (axe if a story moves, journeys if a proxy or mock moves, measurement if typefaces or dimensions move). If nothing can be named, it falls back to the line count in [`volume.ts`](../../scripts/deferred-checks/volume.ts), and lists all three only when the line (`ALERT_AT`) is exceeded. **It is not a gate.** It is not registered as a required check either — the line-count threshold has no theoretical basis, and a number without basis is not placed where it can stop a merge. Labels already applied drop **only that check** (if one label silenced the remaining two as well, checks the labeler did not look at would vanish unnamed). For diffs where `lighthouse` / `e2e` decided to run on their own, that check is not recommended. While each of the three answers "did it run" in its own comment, what this one answers is **"should it have run"** |

### Do not write a machine count into parallelism

Only `a11y` passes `--workers=100%`; `vrt` leaves it to Playwright's default (half the logical cores). `a11y` only checks whether there are violations, but VRT compares pixels, so the degree of parallelism can affect capture timing.

Neither **writes a machine count**. A standard runner has 4 cores in a public repository and 2 in a private one, and what is received is the latter. Writing a count would make this repository's situation the default as is. With a ratio, only the intent is passed and the execution environment decides the core count.

The knob for tuning on larger runners is `VRT_ARGS`, which both `make vrt` / `make a11y` accept ([`.makefiles/testing/vrt.mk`](../../.makefiles/testing/vrt.mk)).

## Workflow List (Security)

Defense in depth ([0110](../../docs/adr/0110-security-operations.md)). Runs on **a weekly schedule + PRs whose diff reaches it**. The weekly run exists because
a CVE can be published even against a tree where not a single line of code moved, which checks triggered by changes alone cannot reach.

**And precisely because the weekly run exists, the PR side can be narrowed.** Each job uses `diff-scope` to decide "diffs that do not reach me" and skips
("Do not use `paths:` filters" below). The precise meaning of the narrowing is that the skipped scans do not vanish but **move to the weekly run**;
if the weekly run were stopped, the narrowing would no longer hold. None of them is registered as a required status check, so skipping does not stop a PR.

| Workflow | File | Job name | Contents |
| --- | --- | --- | --- |
| Secret Scan | `gitleaks.yaml` | `secret-scan` | Scans the commits a PR added with gitleaks. Weekly covers the whole history. Detection is fail-closed |
| SAST | `sast.yaml` | `sast` | Looks at the code we wrote with opengrep. **It keeps a baseline of 0**, so a detection fails it. Accepted findings are placed in the source as `// nosemgrep:` with a reason. **Rules are not pulled from the registry**; it reads `opengrep/opengrep-rules` at a pinned commit ("Do not pull SAST rules from a registry" below) |
| CodeQL Scan | `codeql.yaml` | `codeql` | Answers the same question with GitHub's analysis. Stopping the merge on a high detection is a code scanning setting; this job fails only when the analysis itself did not run |
| Dependency Scan | `dependency-scan.yaml` | `dependency-scan` / `dependency-audit` / `dependency-gate` | Dependency vulnerabilities with Trivy and `pnpm audit`. Three different verdicts on the same target (below) |
| OSV Scan | `osv-scan.yaml` | `osv-scan` / `osv-gate` | Reads the same dependencies with the OSV database. The two stages of report and promotion gate have the same shape as Trivy |
| Dependency Review | `dependency-review.yaml` | `dependency-review` | Looks only at **the dependencies this PR added**. The other dependency scanners look at the current state of the tree and cannot separate carried-over from added. The API it calls is free only when public; private requires a Code Security license. Whether to remove it is chosen in one step of setup |
| Bearer Scan | `bearer.yaml` | `bearer` | Looks at the points where values leave the process, together with the classification of those values. **Does not fail** (below) |
| DevSkim Scan | `devskim.yaml` | `devskim` | Regex checks with no language front end. Reads **files that checks building a syntax tree do not open**. **Does not fail** (below) |
| Tools Cooldown | `tools-cooldown.yaml` | `tools-cooldown` | Checks whether the pins in `mise.toml` satisfy the cooldown period per distribution channel, by fetching the version's publish time from upstream. On PRs **only the pins the diff moved**; weekly, all pins. A backend whose publish time cannot be fetched fails as an inconclusive check, not as "no violations". Exemptions are a comment directly above the pin ([`scripts/tools-cooldown/README.md`](../../scripts/tools-cooldown/README.md)) |
| OpenSSF Scorecard | `scorecard.yaml` | `scorecard` | Measures the repository's own settings. Does not run on PRs |
| SonarQube Cloud Scan | `sonarcloud.yaml` | `preflight` / `sonarcloud` / `report` / `unconfigured-notice` | **The only check that needs an external account.** Without `SONAR_TOKEN` it does not run and tells the PR "not configured" while staying green. Whether to remove it is chosen in one step of setup |
| DAST | `dast.yaml` | `dast` | **The only one that reads responses.** Starts the app, fires HTTP at it with OWASP ZAP, and looks at the delivered surface. Known gaps are held by the list in `.github/zap/rules.tsv`, and **findings not on the list turn it red** |

### Known gaps in the delivered surface are kept as a list

`dast` is a gate from day one. **But a permanently red required check stops every PR, including the PRs that shrink that list.** A wall needs a passable form to work as a wall.

So only the findings currently appearing are listed as `IGNORE` in [`../zap/rules.tsv`](../zap/rules.tsv), and **findings not on the list turn it red**. ZAP keeps the count, rule name, and URL in its output even for rules set to `IGNORE`, so this is a severity downgrade, not silencing ([0110](../../docs/adr/0110-security-operations.md)).

Each line has its reversal condition written on it. A line whose condition is met is deleted — the goal is for the list to become empty, and the list itself is not a deliverable. CSP and its companion headers ([0111](../../docs/adr/0111-csp-security-headers.md)) are in place, and those headers are what ZAP reads. The result of the browser enforcing the headers is watched by `e2e`.

**The measuring side is put in first because, added later, its introduction would be subordinate to the implementation's completion.** In a form where measurement does not arrive until the implementation is done, the list of what is missing is not available until the very end.

### Some layers do not fail

**Not every layer is a gate.** Only layers that can keep a baseline of 0, or that ask only "did this change add it", may be gates ([0110](../../docs/adr/0110-security-operations.md)). Turning anything else red makes red the norm, and the habit of stopping at red breaks first.

| Wiring | Jobs | What turns it red |
| --- | --- | --- |
| Gate | `secret-scan` / `sast` / `dependency-audit` / `dependency-gate` / `osv-gate` / `dast` | The job's exit code |
| Gate | `dependency-review` | The job's exit code |
| Report only | `dependency-scan` / `osv-scan` | Nothing turns it red (fails only when the scanner did not run) |
| Sent to code scanning | `bearer` / `devskim` | GitHub's check on **alerts newly introduced by the diff** |
| Sent to code scanning | `codeql` / `sonarcloud` | Same as above |

**"Does not fail" applies only to findings; if the mechanism breaks, it fails.** For `bearer` / `devskim` / `scorecard` the report is the entire output, so a scan that did not run, SARIF that was not written, or an upload that did not arrive would all be the same green as a clean result. **A gate that does not check cannot be told apart from "no violations"** ("Do not use `paths:` filters" below).

The third is wiring that separates "does not fail" from "does not show": the job returns green, but alerts the diff introduced turn the PR red.

### Three verdicts look at the same dependency vulnerabilities

| job | Means | When it fails |
| --- | --- | --- |
| `dependency-scan` | `make trivy-fs` | **Does not fail on detection.** Fails only when the scanner did not run |
| `dependency-audit` | `make audit` | Fails if there is even one `high` / `critical` with a fixed version available |
| `dependency-gate` | `make trivy-fs-release` | Starts only on PRs targeting a protected branch, and fails on any detection |

**A report-only job is needed because vulnerabilities "cannot be resolved on the spot by the change's author" and "change state independently of the change".**
Building a gate from that creates the same path as `--no-verify` on the CI side. The one place to stop is promotion (a PR targeting a protected branch),
which is where someone takes on the risk and decides ([0110](../../docs/adr/0110-security-operations.md)).

**The counts from Trivy and `pnpm audit` do not match. Do not try to reconcile them and eliminate the difference.** Their counting units (CVE / advisory) and
the databases they consult differ, so treating only one as authoritative makes the area that tool does not see a permanent blind spot. **The union is authoritative**, and anything
that reaches the threshold in either one is treated as blocking.

`dependency-gate` skips with `if:` rather than a `branches:` filter because of how required checks work ("required status check" below).

## Workflow List (Components)

Checks targeting the design system components (`src/components/**`). Like the other CI Checks they run on **every PR**,
and both are registered as required status checks.

| Workflow | File | Job name | Contents |
| --- | --- | --- | --- |
| Component Classes | `component-classes.yaml` | `component-classes` | Detects undefined classes that Tailwind does not output |
| shadcn Drift | `shadcn-drift.yaml` | `shadcn-manifest` / `upstream` | Detects divergence between the import ledger and the actual files (`shadcn-manifest`), and upstream updates (`upstream`) |

`upstream` goes out to the network, so it is skipped on PRs (`if:`) and runs only on the weekly schedule. **Not registered** —
because it would stop work for a reason the PR author cannot fix: upstream moved.

## Workflow List (Event-Driven)

These do not run per PR; they start on labels or pushes to protected branches. **They are not registered as required status checks** (a PR that does not start them would not report the context).

> **Workflows started by `workflow_run` run with the default branch's definition.** `baseline-retake` is one of them.
> The job checks out the PR's branch, so **the code is the PR's**, but **the workflow definition itself
> (including `env:` and `uses:`) is the default branch's**. Fixing the definition on the PR's branch
> has no effect on runs for that PR — it does not take effect until it reaches the default branch. When the definition needs a fix,
> it must go into the default branch separately from that PR.

| Workflow | File | Job name | Contents |
| --- | --- | --- | --- |
| Baseline Retake | `baseline-retake.yaml` | `retake` / `report` | Fires on **completion** of VRT or E2E and, if the `baseline-retake` label is applied, retakes **the baseline images of both stories and screens together**, pushes them to the store, and advances the submodule pointer. For both stories and screens, **only the reported differences** are targeted, and the reports are pulled from each run's artifact (`vrt-report` / `e2e-report`). When there is no screen report, nothing is captured — falling back to everything would make pixels the comment never showed anyone authoritative. When both are red, the E2E run yields to the VRT one — so that one side alone does not use up the label, which keeps "one label, one retake". The label is a condition, not a trigger, so it can be applied when the PR is created (no need to wait for VRT to finish). **While a check that can move pictures** (named by `DECIDES_PIXELS` in `baseline-retake.yaml`) is failing, it holds off without capturing and leaves the label (it resumes automatically on the next run). Only the latest attempt of each check is looked at, and the naming is an allowlist — counting everything that is failing would deadlock with `baseline-approval`, which waits for images that do not exist until captured. On branches starting with `revert-`, everything is retaken without a label (because cleanup removed the set to return to). The pointer push uses the App's token, not `GITHUB_TOKEN` (a push with `GITHUB_TOKEN` does not trigger runs, so the confirming VRT would not run). **It is not approval** — the pixel judgment is made in PR review by looking at the before and after of the moved images the comment lays out |
| VRT Guard | `vrt-guard.yaml` | `guard` | Redoes the story comparison after a push to a protected branch. Normally it stays silent (PRs are judged on the merge result and branches are required to be up to date). If it fires, an issue is opened as a sign a premise broke. **It does not retake baseline images** |
| Lighthouse | `lighthouse.yaml` | `lighthouse` | On pushes to protected branches and once a day, opens the screens declared by `e2e/lib/screens.ts` one at a time in Lighthouse and compares LCP / CLS / TBT with the limits in `performance-budget.yaml` ([0101](../../docs/adr/0101-performance-budget.md)). When it fails, an issue is opened (one per branch; a second failure comments on the same issue). **It does not look at the performance score** — a weighted average of 5 metrics cannot say which one dropped when it drops. INP requires real user interaction and cannot be measured in the lab, so TBT stands in. Unlike captures (`vrt` / `a11y` / `e2e`), the browser is not confined to a container because what is compared is numbers, not pixels — what must be pinned is not font rasterization but the browser version, which the lockfile handles. **It does start on PRs, but measures only when the diff requires it** — if screen declarations or layout shells moved, it measures without waiting. **What this job looks at is only the structure it can decide to measure on its own**; naming diffs that should run via label is done by `Deferred Checks` for all three together. It also runs with a label (`run-lighthouse`). **The reason it does not run everything on PRs is measured** — measurement only holds when serial (measuring concurrently mixes the parallelism itself into the numbers), and 23 screens × 3 attempts × about 14 seconds ≈ 16 minutes, against about 1 minute for the build. Cost is pinned to `screens × attempts`; cutting attempts loses the median that absorbs runner jitter, and cutting screens loses the point of drawing the full set from the declarations. **If something is cut, it is frequency, not coverage**: the price paid is the same as in "Deferred Checks" above, and what it buys is that PRs wait not a single second |
| Baseline Prune | `baseline-prune.yaml` | `report` | Measures the baseline image store monthly, and opens an issue prompting cleanup only when it exceeds the threshold. **It does not delete** — rewriting history is irreversible, so a human triggers it with `make baseline-prune` |

## Workflow List (Documentation)

| Workflow | File | Job name | Contents |
| --- | --- | --- | --- |
| Deploy Docs | `deploy-docs.yaml` | `docs-build` / `docs-deploy` | Assembles the generated-HTML documentation site and delivers it to GitHub Pages ([0141](../../docs/adr/0141-portal-operations.md)) |

The site takes the form of **several generated artifacts living together in a single tree**. GitHub Pages allows only one site per repository, so generated HTML such as Storybook, the portal, and coverage each go into sibling paths directly under the site, and the root is kept as a thin layer that only redirects to the entry page ([`../../docs/index.html`](../../docs/index.html)).

| Path | Contents |
| --- | --- |
| `/` | Redirect to the entry page (`/portal/`) |
| `/portal/` | The docs portal ([0141](../../docs/adr/0141-portal-operations.md)). Output of `pnpm portal:build` |
| `/storybook/` | Storybook (output of `pnpm build-storybook`) |
| `/<dir>/`, `/*.md` | The contents of `docs/` as is. Portal cards reference them as `../<dir>/<file>` |

`docs/` is copied to the site root so that relative paths (`../<dir>/<file>`) to documents discovered automatically by the scan hold. Removing this turns every auto-discovered card into a dead link.

Delivery fires on pushes to `production` (+ `workflow_dispatch` for running from any ref). No `paths:` filter is attached — the reason is not the same as in "Do not use `paths:` filters" below, but the judgment that, since a release can change appearance through indirect paths (tokens, dependency updates, configuration), the maintenance cost of predicting and listing target paths is higher.

On a PR that edits this workflow itself, only `build` runs as a self-check (`deploy` excludes `pull_request`), because a broken delivery would otherwise go unnoticed until the release that needs it. This PR run is **not registered as a required status check** — a PR that does not touch the file would not report the context and would be stuck waiting on the requirement.

**Enabling GitHub Pages is done by the user in Settings** (the workflow does not auto-enable it with `actions/configure-pages`). Runs before enabling fail in the deploy job.

## required status check

[`../settings/branch-protection.json`](../settings/branch-protection.json) makes **the CI Checks group required**, and with `strict` requires the branch to be up to date. This is also the condition under which VRT holds — what is judged is the tree resulting from merging into base (`refs/pull/N/merge`), so passing a green result as is after base moved would put the baseline images out of step with "the tree that actually gets merged".

**Only jobs that keep reporting their name on every PR may be registered.** Registering a context that is not reported blocks the PR forever ("Do not use `paths:` filters" below). `deploy-docs`'s `docs-build` is narrowed by `paths:` to changes to itself, so it is not registered.

This condition is checked mechanically by `make actions-required-check-lint` (run by the `actions-lint` job and pre-commit). When it fails is owned by `.makefiles/README.md` ([`.makefiles/README.md`](../../.makefiles/README.md)).

Jobs that skip via `diff-scope` may be registered, because neither the job name nor the context report changes; only whether the steps inside run changes ("Do not use `paths:` filters" below).

Note that the context name is **the job name, not the workflow name**. Renaming a job silently disables the required status check setting. For the same reason, **do not give jobs that can report on PRs the same name in different workflows** — two check runs would appear under one name, and which one the requirement points to would be undecidable. That is why `deploy-docs`'s jobs are named after their destination, `docs-build` / `docs-deploy`.

**Jobs that do not report a context to PRs are outside this constraint.** `notify-failure` / `notify-detection` start only on scheduled runs and carry the same name across 10 workflows — this is not duplication but **the same role carrying the same name**. Splitting the name per workflow would make the single concern of notification look like 10 different things. The `report` of `baseline-prune` / `baseline-retake` sits side by side for the same reason.

<!-- boilerplate-only:replace-begin -->
**Jobs that do not survive the creating side's initialization (`purge-verify` / `strip-verify`) are not registered either.** `strip-verify` disappears along with itself when stripping runs, and after it is gone it reports no context. `purge-verify` remains, but on a creating side that has finished the purge it is designed to stop red with "already purged, so delete this workflow", and deleting it as instructed likewise stops its reporting. `branch-protection.json` is JSON and can hold no comments, so no removal marker can be placed in it; registering them would leave every PR on an initialized creating side stuck waiting on the requirement.
<!-- boilerplate-only:replace-with -->
<!-- = **`purge-verify` is not registered.** After the sample is purged it is designed to stop red with "already purged, so delete this workflow", and deleting it as instructed stops its context reporting. `branch-protection.json` is JSON and can hold no comments, so no removal marker can be placed in it; registering it would leave every PR after the purge stuck waiting on the requirement. -->
<!-- boilerplate-only:replace-end -->

## Installing mise

Node / pnpm and the like are supplied by the composite action [`../actions/setup-mise`](../actions/setup-mise/action.yaml). Every job needs mise, so **fetching must always retry, and what has been fetched once must be reusable** — it sits where a temporary hiccup on the distribution side turns directly into every job failing.

What this action holds:

| | |
| --- | --- |
| Retry | `curl --retry 5 --retry-all-errors`. The fetch is written to a file before verification (left in a pipe, a partially received payload would flow into the shell) |
| Cache | Keeps the binary keyed by the pinned version and digest |
| **Digest verification** | On both the restore and fetch paths, verifies the SHA256 before running. On mismatch it discards and refetches; if it still does not match, it fails |

**Verification is needed because the Actions cache is not a trust boundary.** The cache is shared across branches, and anyone with push permission can replace its contents. What is placed there is an executable binary, so without verification, cache poisoning becomes arbitrary code execution inside CI. The same reason and the same form as pinning `uses:` by SHA and container images by digest.

### Upgrading mise

1. Get the SHA256 for `mise-v<version>-linux-x64` from upstream's `SHASUMS256.txt`

   ```bash
   curl -sSL "https://github.com/jdx/mise/releases/download/v<version>/SHASUMS256.txt" | grep 'linux-x64$'
   ```

2. Update `MISE_VERSION` / `MISE_SHA256` in [`../actions/setup-mise/action.yaml`](../actions/setup-mise/action.yaml), keeping the version and digest prefix in the cache key consistent with them

## hooks mirror CI

The 6 jobs `lint` / `md-lint` / `typecheck` / `actions-lint` / `actions-pin` / `images-pin` run **the same commands** that [lefthook](../../.lefthook.yaml) runs. `test` is a two-tier run: against pre-commit's `make test-cached`, pre-push and CI run `make test-full`. Hooks are the fast first stage and CI is the authority — two tiers ([0153](../../docs/adr/0153-ci-configuration.md) / [0151](../../docs/adr/0151-git-hooks.md)).

The rest exist on one side only. **Which side holds them is a deliberate placement**, not an omission to be aligned.

| Check | Held by | Reason |
| --- | --- | --- |
| `build` / `smoke` | CI only | A full build does not fit the hooks' speed target (30 seconds). Trying to fit it would invite habitual `--no-verify` |
| `bundle-budget` | CI only | Same as above. It also needs a build of the base branch, so locally it costs two builds |
| `lighthouse` | CI only | In addition to the above, it runs the browser screens × attempts times, missing the hooks' speed target by an order of magnitude. **It does not run on PRs** (see "Event-Driven" below). The local entry is `make lighthouse` |
| `dead-code` | CI only | Reachability is decided after resolving the whole workspace. In a work-in-progress tree, half-written imports sound as unused, and stopping on them in a hook builds a habit of pushing through |
| `test` | pre-push + CI | pre-commit uses the cache to favor iteration during development; before push and in CI, a full run including coverage applies the gate |
| `scripts-check` | pre-push + CI | The same two tiers as `test`. The job is split from `test` because what lives in `scripts/` is the checking machinery itself, which, when broken, falls toward reporting "no violations". So the meaning of red is not confused between "the machinery broke" and "the app regressed" |
| `purge-verify` | CI only | Purging is irreversible, so it is not run in hooks. It is a check that assumes a throwaway checkout; run on the local tree it would delete the sample being worked on |
| `strip-verify` | CI only | Same as above. Run on the local tree, it strips the boilerplate-only text and deletes the stripping tool along with it <!-- boilerplate-only:line --> |
| `lockfile-drift` | CI only | Locally, install rewriting tracked files cannot be told apart from "changes I made". CI, looking with third-party eyes, holds it |
| commitlint | Hooks only | Checks commit subjects. Redoing only works per commit, and failing it after the PR arrives would leave rebase as the only fix |
| secret-scan | Hooks + CI | Calls the same `make secret-scan`, but **how the scan range is decided differs**. The hook's default is "commits not on any remote", and a PR's branch is already pushed, so in CI that is 0. CI passes the range from base with `SECRET_SCAN_LOG_OPTS`. The whole history is weekly only (`make secret-scan-history`) |
| Dependency vulnerabilities | CI only | For the same reason as "Three verdicts look at the same dependency vulnerabilities" above, putting it in hooks would teach habitual `--no-verify` |
| `sast` | CI only | The scan takes about a minute and does not fit the hooks' speed target. To confirm locally, `make sast` runs the same check as is |
| `sonarcloud` | CI only | The analysis runs on SonarCloud's side; locally there is only an endpoint to read results. `SONAR_TOKEN` is not handed out to developer environments in the first place |
| `dast` | CI only | It involves build and startup, so it does not fit in hooks. To confirm locally, point `DAST_TARGET=http://host.docker.internal:3000 make dast` at something started with `pnpm start` |

## Common Skeleton

Every workflow keeps the following. Deviating requires amending the ADR. The reference implementation of the step layout is `lint.yaml`, which also carries comments on what each step is for.

- **SHA pins for actions** — `uses: owner/repo@<40hex> # <tag>`. Moving tags are forbidden. **The SSOT for the version is the tag in the trailing comment**, and the tag → SHA mapping is held by [`../actions-pin.toml`](../actions-pin.toml). Resolve with `make actions-pin-resolve`, apply with `make actions-pin-apply`, check with `make actions-pin-check` (run by the `actions-pin` job and the pre-commit hook; details in [`.makefiles/README.md`](../../.makefiles/README.md))
- **Minimal permissions** — top level is `contents: read`. Only jobs that write PR comments add `pull-requests: write`
- **concurrency** — `${{ github.workflow }}-${{ github.ref }}` / `cancel-in-progress: true`. Consecutive pushes to the same PR do not pile up old runs. **Delivery is the only exception**: the group is a shared resource name (`pages`) with `cancel-in-progress: false` ([0153](../../docs/adr/0153-ci-configuration.md)). There is not one destination per ref but only one, and cutting a deploy in flight would serve a partially transferred artifact on the live site. **Tipping it to `false` to pile up protected-branch checks is also forbidden** — results for an old tree would be reported after, and overtake, results for a newer tree. Not reading a cancelled run as a failure is the responsibility of the condition expression (`!cancelled()`)
- **harden-runner** — at the start of every job, outbound traffic is **blocked** (`block`). The SSOT for allowed destinations is the single [`../egress.yaml`](../egress.yaml); `make egress-apply` applies it and `make egress-check` fails on drift (same shape as `actions-pin`; why it cannot be moved into a composite action is in [0153](../../docs/adr/0153-ci-configuration.md)). **The basis for adding a destination is measurement**, and anything whose record is incomplete stays at `audit` in the declaration
- **Checks that can move pictures are registered with the retake** — when you add a job whose failure can change the appearance of stories, add its job name to `DECIDES_PIXELS` in [`baseline-retake.yaml`](baseline-retake.yaml). **When renaming a job, keep both old and new names** — this array is read by the retake side started by `workflow_run`, where the default branch's definition is used (above). Until the renaming PR reaches the default branch, the old name is what gets matched. Remove the old name after the default branch catches up. A name with no corresponding check run simply does not match and does no harm. **If you forget to add it, pictures captured from a broken tree become baseline images** (it is an allowlist, so anything unregistered is silently ignored). Conversely, do not add checks whose failure does not change pictures — the retake would just stop, and the retake side could not explain why it stopped
- **The SSOT for version numbers is `mise.toml`** — versions of Node / pnpm / actionlint / shellcheck / zizmor are not written on the workflow side. [`../actions/setup-mise`](../actions/setup-mise/action.yaml) supplies them from `mise.toml` ([0003](../../docs/adr/0003-version-manager.md)). **`matrix` is not used for crossing versions or OSes**; a single `ubuntu-latest` is used. A `matrix` for splitting work is different: only checks whose cost is proportional to item count and which already use up one machine's parallelism use it. Even then, **the required check is the single aggregating job**, not the matrix side ([0153](../../docs/adr/0153-ci-configuration.md))
- **The exception is the mise CLI's own version** — `mise.toml` declares what mise resolves, and cannot declare mise's own version. This one alone is written inside `setup-mise` **as a version and SHA256 pair** ([below](#installing-mise))

## Do not use `paths:` filters

CI Checks workflows do not get `paths:` / `paths-ignore:`.

A workflow narrowed by `paths:` is **not executed and reports no status context** on PRs that do not match. If a context designated as a required check is not reported, GitHub blocks that PR forever as "waiting for required checks". Filling the gap would mean pairing it with a guard workflow that immediately succeeds a job of the same name (one whose `paths-ignore` is the main workflow's `paths` inverted).

Every CI Check in this repository finishes in minutes, and the maintenance cost of "always keeping the main and guard files as inverses of each other" is higher than the execution cost. So no filters are attached, and every job runs on every PR.

If a job heavy enough that you want to narrow it with `paths:` (e2e, etc.) is added in the future, **always choose either to provide a paired guard or to remove it from the required checks**. Doing only one makes merging impossible immediately.

**The third way is [`../actions/diff-scope`](../actions/diff-scope/action.yaml).** The job always starts and reports its context, and only the heavy steps are dropped with `if:`. The job name does not change, so neither the required check nor a guard needs touching, and on an unrelated PR all that is lost is a few dozen seconds of checkout and decision. `bundle-budget` / `vrt` / `a11y` use it.

What is passed is a list of "**what cannot affect me**", not a list of what does. An omission costs one wasted run, but a mistake falls toward the job silently checking nothing. **A gate that does not check cannot be told apart from "no violations"**. The decision implementation shares this action and must not be re-written per job — a decision split three ways always drifts, and the drift proceeds silently.

**The list itself is not shared.** Only the list the caller wrote takes effect, and the action has no default. `bundle-budget` can exclude `*.css` / `tokens/*` / `.storybook/*` / `*.stories.tsx` / `*.test.ts` because what it measures is only the amount of `.js`; bringing the same lines into `vrt` / `a11y` would stop the check on PRs that change pictures. With a default, lines the caller never wrote could silence a gate — the list is **a per-job claim** that "this does not reach this job", not a fact that can be shared.

| job | Excluded scope |
| --- | --- |
| `bundle-budget` | Documentation and AI agent configuration + what only affects pictures (CSS / tokens / stories / tests) |
| `vrt` / `a11y` | Documentation and AI agent configuration only |
| `sast` / `devskim` | Documentation and AI agent configuration (+ `public/` for SAST) |
| `bearer` | Same as above + what is outside `src` (the catalog / baseline images / the generated documentation site) |
| `dast` | Same as above + what does not appear in delivered responses (stories / tests / CSS / tokens) |

### Only dependency scanners write the "can affect" side

`dependency-scan` / `dependency-audit` / `osv-scan` / `tools-cooldown` pass **`only:`** rather than `ignore:`. Dependency vulnerabilities are decided by the lockfile and pin publish times by `mise.toml`; however much the source moves, the scanners' answer does not change. Trying to write it on the "cannot affect" side would mean "everything except the lockfile", which is not a writable form.

**This is the only place an allowlist is permitted, and there are two conditions.**

1. **The job's target is not the tree itself.** Dependency scanners read the lockfile, and the source is not their input
2. **A weekly schedule scans the whole tree.** An omission from the allowlist costs "not running for a week", not a permanent blind spot

Without condition 2, an omission becomes **"a gate that checks nothing"** as is. The same note is placed on the `diff-scope` side.

`dependency-gate` / `osv-gate` (promotion gates) **do not skip**. Promotion is where someone takes on the current state of the tree and decides, and the fact that the PR's diff does not touch the lockfile is no reason not to take on the vulnerabilities the tree holds. `dependency-audit`, on the other hand, does skip — a verdict inherited from base cannot be resolved on the spot by the change's author, and turning it red is exactly the form [0110](../../docs/adr/0110-security-operations.md) forbids.

It is not applied to `codeql`. A code scanning alert closes only when "a later analysis no longer reports it", and omitting analysis per PR could drop the occasion for closing. **This is a check that entrusts its judgment to GitHub's mechanism, so its run count is not reduced for our convenience.**

**The authority for the list contents is each workflow's `ignore:` block** ([`bundle-budget.yaml`](bundle-budget.yaml) / [`vrt.yaml`](vrt.yaml) / [`a11y.yaml`](a11y.yaml)). This table only shows which scope is excluded and does not copy paths — copying would add one more place that silently drifts from the actual contents.

`vrt` / `a11y` have one more decision inside this gate, which omits only the comparison by hashing the inputs that decide the picture. What each of the 2 layers drops is summarized in [Do not capture when the picture cannot have changed](../../vrt/README.md#do-not-capture-when-the-picture-cannot-have-changed) in `../../vrt/README.md`.

Only `deploy-docs` has `paths:`, and it **chooses the latter (removing it from the required checks)** — it runs only on PRs that edit itself, so removing the narrowing would assemble the Pages site on every PR.

`component-classes` / `shadcn-drift` run on every PR without narrowing. Both are `pnpm install` plus one script, and they do not use `diff-scope` because that action takes a list of "**what cannot affect me**" — inverting the narrow allow-list these two hold would make a mistake fall toward "a gate that checks nothing".

## PR Comments (Check Logs: upsert-pr-comment)

Every job other than coverage does not fail on its check result immediately; it first captures it, upserts a PR comment with [`../actions/upsert-pr-comment`](../actions/upsert-pr-comment/action.yaml), and then fails fail-closed at the end.

- A comment is identified by an HTML marker (`<!-- lint-result -->`, etc.), and **within the same PR it is updated rather than multiplied**. Markers are unique per job
- **No comment is created when green.** The caller passes the verdict to `status:`, and new creation is suppressed only on `success`. If every job left a comment every time, the PR conversation would fill with 20+ "PASS" entries, and the one FAIL among them would not reach the reader. **The value of a notification is decided by signal-to-noise ratio, not by count**
- **But only "creating" is suppressed, not "updating".** If a comment already exists, it is overwritten even on `success`. This avoids leaving an old FAIL after fixing FAIL → PASS, which "do nothing when green" cannot achieve
- **Jobs that call REST use the App's installation token.** The `GITHUB_TOKEN` limit is **1,000 req/h per repository**, shared by all workflows and all open PRs. An installation token has 5,000 req/h. `baseline-retake` fires on every VRT / E2E completion and makes about 10 calls each time, so it is the side that runs dry first, and retakes actually stopped with `API rate limit exceeded for installation`. The permissions at minting **name only what that job's calls need** (minting for push is on the `setup-baselines` side, obtained separately with different permissions). **Minting is allowed to fail** (`continue-on-error`) — requesting a permission the installation does not grant returns 422, which as is would fail the whole job, worse than the quota exhaustion it tried to avoid. If it fails, the output is empty, the calls fall back to `GITHUB_TOKEN`, and the retake proceeds. Even without registering the App it keeps working on the same path — only the quota is smaller. **Jobs that post comments are excluded from this**: a long-lived private key would enter a job that composes bodies, contradicting "do not pass `secrets.*` through `env:`" below. `a11y` / `e2e` already split commenting into a separate job in this shape, and only the side that opens issues holds the token. `lighthouse` does both in the same job and so has not been aligned — aligning it would mean splitting the job
- **A missing body file is treated not as a failure of the posting step but as the job having been cut short.** A cut-short job never reaches the step that writes the body. Failing here would turn only the posting step red on a run that merely produced no result. **Return without posting anything** — the check list already shows it was cut short, and the comment would only restate that. The cost shape is bad too: a cut-short run has no verdict, so it slips past the `success` suppression and always triggers a write, and the situation where it happens (an interrupted job) coincides with consecutive pushes, so **consumption spikes exactly when the API quota is tightest**
- **When skipping via `diff-scope`, pass `status: success` and update.** A skipped job reports green, so dropping the post entirely would leave the FAIL comment from the previous push sitting next to a green check. It is a path you always hit when fixing a red change by reverting it to content identical to base (the correct way in this repository, which does not rewrite history). Upserting a body stating that it skipped attaches nothing to a PR with no comment, and replaces the red one on a PR where it remains
- **Report-only scanners pass their verdict as "found something", not "ran".** The `dependency-scan` / `osv-scan` jobs are designed not to fail on detection, so passing the job's success as `status` would let a run that found vulnerabilities suppress the comment as `success`. It is split into 3 values (`success` / `findings` / `failure`), distinguished by the scanner's exit code (`TRIVY_FS_DETECT_EXIT` / `OSV_DETECT_EXIT`)
- The posting step is `continue-on-error: true`. PRs from forks have a read-only token and cannot post, but that does not fail the check's verdict
- **Do not pass `secrets.*` to check commands through `env:`**. Actions secret masking only applies to the path the runner captures for log display; content dropped into a file with `tee` passes straight through. That file is posted as is into PR comments on this (public) repository. Only `GITHUB_TOKEN` is an exception (a short-lived token needed for the posting itself). This convention is checked mechanically by `make actions-comment-secret-lint`, but it can only follow direct references in `${{ }}` expressions; indirect passing via `needs.<job>.outputs` passes the check — **the convention is authoritative, and the check is a regression guard**. **The other blind spot is jobs that call `gh pr comment` directly**: the check only covers jobs that reach `upsert-pr-comment`. `baseline-retake`'s `retake` is one of these, and since it is the only job that posts to the PR while holding the App token, its bodies are all kept as literals written in the workflow (the job says the same)
- **Identifying an existing comment requires both "the bot as poster" and "starts with the marker"**. In a public repository a third party can post a comment containing the marker first, and every workflow posts as the same bot, so either one alone is not an identification (getting a check log to print another workflow's marker could steer that workflow to the wrong comment). As a premise for this, **pass `github-token` a token that posts as the bot** — with a personal PAT it can post but never update again
- **The fence used to fold the body is decided from the body**. Linters and compilers print source lines as is into check logs, so their contents are controllable by the PR submitter. Wrapping with a fixed triple backtick lets the body close the fence itself, and what follows renders as raw Markdown (notifying third parties via mentions, fake headings and links posted under the CI bot's name). Callers must not assemble fences themselves and use `details-summary` instead (the reversal condition is item 5 of ADR 0153)
- **Pass only static literals to `title` and `details-summary`**. Sanitization works only on the body (`body-file`); `title` is placed **outside** the fence as raw Markdown, and `details-summary` as raw HTML. A change that summarizes log contents into `title` would revive, from outside, the injection the fence closed

Only coverage needs structured reporting of line-level coverage and the difference from the base branch, so octocov in `test.yaml` posts a dedicated comment. **This is a measurement, not a verdict, so it keeps posting even when green** — what "do not create when green" above targets is comments that say nothing but "PASS". But **they must not pile up**, so `updatePrevious: true` is set in `.octocov.yaml` (the default creates a new comment on every push). The test failure details themselves are posted not by octocov but by this upsert foundation — octocov reports only coverage and does not say which test failed. Other check logs (including security scan results / generated-artifact drift) ride on this composite action.

## Do not pull SAST rules from a registry

The rules `make sast` reads are extracted from `opengrep/opengrep-rules` **at a pinned commit**. Registry references such as `--config p/javascript` are not used.

**The reason is the license.** The set `p/*` returns (`semgrep/semgrep-rules`) is under the **Semgrep Rules License v1.0**, which is not an OSI-approved license.

> You may use the rules only for your own internal business purposes.
> This license does not allow you to distribute the rules, or to make them available to others as a service.

The decision to adopt opengrep, an OSS fork, as the engine was "not to hand license decisions to the consuming side" ([0110](../../docs/adr/0110-security-operations.md)). **As long as rules are pulled from the registry, that decision does not hold** — even if the engine is LGPL, if the rules being run are internal-use only, the decision has merely been handed over one layer off.

| | Source | License |
| --- | --- | --- |
| Engine | opengrep pinned by mise | LGPL-2.1-or-later |
| Rules (registry `p/*`, not adopted) | semgrep.dev on every scan | **Semgrep Rules License v1.0** |
| Rules (adopted) | `opengrep/opengrep-rules` at a pinned commit | LGPL-2.1 + Commons Clause |

### Extraction is decided by three constraints

**1. Not a single test specimen is placed on disk.** The store holds nearly as many **specimens** (intentionally vulnerable source) as rules, and `java/` `php/` contain real webshells. Extracting as is would place them on developers' machines and runners, and antivirus would react. So **after narrowing by language, only the YAML files are extracted by name from the archive** — "extract everything, then delete" would reach the same set but touch disk along the way.

**2. The `audit` category is not taken.** Adopting `security/` wholesale makes it impossible to keep a 0-finding baseline because of `audit` findings. It is a category the registry's `p/javascript` also excludes by default, **findings meant to be read and judged**, not ones premised on riding a gate. The same rules are also dropped in the security config of [`eslint.config.ts`](../../eslint.config.ts), for the same reason.

**3. Verification is applied to what was extracted, not to the archive.** The tarballs GitHub generates automatically are not byte-stable (if the gzip settings change, the digest moves even for the same commit). What we want to verify is "are the rules we run the same as the pinned ones", not the packaging, so **the digest is taken over the set of extracted YAML**. On mismatch it fails **without placing anything** — verifying after placing would leave unverifiable rules in the tree after the failure, and the next run would read them as "pinned".

The implementation is [`../../scripts/opengrep-rules/`](../../scripts/opengrep-rules/), and the pinned values are held by [`../../opengrep-rules-pin.toml`](../../opengrep-rules-pin.toml) — the same shape as `.github/actions-pin.toml` / `docker/images-pin.toml`. **The digest is not written into source so as not to create a step where a human copies it**; `pnpm exec tsx scripts/opengrep-rules --resolve --commit <sha>` rewrites the lockfile. **A rule id carries the store's path as a prefix** (`tmp.opengrep-rules.javascript.…`), so moving the store turns existing code scanning alerts into different ones all at once. Suppression (`// nosemgrep:`) works with the bare id without the prefix.

### What is given up in exchange

**Fewer rules.** The set extracted from the pinned commit is smaller than the registry's three packs. `p/owasp-top-ten` is a pack spanning multiple languages, most of which have no target in this repository, but **even after subtracting that, it is smaller**.

**Rules are not updated.** `opengrep/opengrep-rules` is a fork from just before the license change (2024-12-13), and upstream moves slowly. New rules do not arrive. **The freshness of this layer is supplemented by CodeQL** (GitHub keeps updating it), so SAST as a whole does not freeze.

This decision is revisited when the registry's rules return to an OSI-approved license, or when the pinned source stops updating and measurement finds **a surface no other layer can cover either**. **Having fewer rules or slow upstream updates alone are not conditions** — the reduction itself was chosen knowingly, and the condition is being able to say, from measurement, that "what was lost is nowhere else".

## What to Change When Adopting

The contents of the workflows do not depend on the organization, but **what is given as GitHub-side settings cannot be carried over.** Whether to keep checks that need credentials
can also only be decided by the side that holds the contract.

| What | Default | Where to change |
| --- | --- | --- |
| The set of required checks and the protected branch names | [`../settings/branch-protection.json`](../settings/branch-protection.json) makes the CI Checks group required and protects the release and hotfix lines | That file. Apply with `make branch-protection-apply`. The conditions for registration are [above](#required-status-check) |
| Labels | [`../settings/labels.json`](../settings/labels.json) | That file |
| Checks that need credentials | CodeQL / SonarQube Cloud / Dependency Review skip themselves and stay green if credentials are absent | To keep them, register the secrets; to remove them, `make setup-remove-licensed-scanners` |
| Notification destination | `SLACK_WEBHOOK_URL`. If unset, delivery is skipped and it stays green | A repository secret. To replace the transport entirely, the last 2 steps of [`notify.yaml`](notify.yaml) and the callers' `secrets:` lines ([above](#notifications)) |
| Scheduled run times | The weekly security checks and the daily heavy checks each run at fixed times | Each workflow's `schedule:` |
| Writing to the baseline image store | Reads a dedicated GitHub App's credentials from secrets | [`vrt/README.md`](../../vrt/README.md#what-to-change-when-adopting) |
| Documentation delivery destination | GitHub Pages. The delivering branch is held by both a make variable and `deploy-docs.yaml` | When changing it, **align both**. Changing only one stops delivery |

**Renaming a job silently disables the required check setting** (the context name is the job name; [above](#required-status-check)). `make actions-required-check-lint` checks that the two match.

The order for applying all of these the first time is held by
[`docs/get-started/setup-repository.md`](../../docs/get-started/setup-repository.md).

## Related ADRs

The decisions the workflows here follow. **Comments in the workflow definitions do not cite an ADR
directly — they come here instead.** An ADR's number, section and owning record all move, while this
README moves with the workflows, so the movement never reaches the definitions
([docs/rules.md](../../docs/rules.md#comments)).

- [0004](../../docs/adr/0004-library-management.md) — dependency update policy: majors go in their own PR
- [0011](../../docs/adr/0011-no-docker.md) — what the delivery boundary does and does not promise
- [0051](../../docs/adr/0051-styling-system.md) — the responsive bands the screen checks read
- [0054](../../docs/adr/0054-ui-catalog-storybook.md) — the catalog the visual and a11y checks ride on
- [0072](../../docs/adr/0072-api-type-generation.md) — generated artifacts carry no findings of their own
- [0082](../../docs/adr/0082-client-observability.md) — which metrics are collected from real users
- [0090](../../docs/adr/0090-testing-strategy.md) / [0091](../../docs/adr/0091-test-verification-methods.md) — the framework split and what a real browser owns
- [0101](../../docs/adr/0101-performance-budget.md) — the budget and the metrics it is written against
- [0102](../../docs/adr/0102-browser-support.md) — the support matrix the checks are run against
- [0110](../../docs/adr/0110-security-operations.md) — scan thresholds, suppression format, fail-closed gates
- [0140](../../docs/adr/0140-documentation-operations.md) — what a document must carry
- [0141](../../docs/adr/0141-portal-operations.md) — what the documentation site publishes
- [0150](../../docs/adr/0150-git-workflow.md) — the branches an environment is deployed from
- [0153](../../docs/adr/0153-ci-configuration.md) — job partitioning, SHA pinning, secrets, the character set the public surface may carry
- [0155](../../docs/adr/0155-claude-skills-development.md) — shell as the exception to TypeScript
- [0157](../../docs/adr/0157-inspection-declaration-discipline.md) — report a gate as it reported itself; never through a filter that classifies by vocabulary
- [0160](../../docs/adr/0160-agent-environment-loop.md) — the re-measurement step and what the loop may read

## Notifications

**Only scheduled runs notify.** On a PR, both kinds of event already reach the author — either the check turns red or a PR comment states the finding. Adding a notification there would only duplicate into chat what the author is already looking at. A weekly run has no author. **Events that happen to a tree nobody touched** are what is worth pushing out from the repository side.

The destination is held by the reusable workflow [`notify.yaml`](notify.yaml), called in two modes.

| Mode | Caller | What it conveys |
| --- | --- | --- |
| failure | Every security check that runs weekly | That the job failed (or was cancelled). **Scan output is not included** — only the run URL is passed, so there is no path by which secrets or vulnerability details reach the destination |
| detection | `dependency-scan` / `osv-scan` | That **a check designed not to fail found something**. The job ends green, so failure mode would never fire |

Unless detection can say "what was found", it cannot identify the event it reports. So it carries a body, but **only identifiers go into it** ([`../actions/notify-detail`](../actions/notify-detail/action.yaml) extracts from the log only strings shaped like advisory identifiers). A rule like "the first N lines" would eventually carry the values themselves. `secret-scan` is not given detection mode for the same reason: what can appear in its log is the detected secret itself.

**Cancellation (`cancelled`) is counted as failure.** A weekly run is cancelled usually when the previous run is still around or the runner went down, and either way it "did not run". Left indistinguishable from green, weeks that did not run pile up.

If `SLACK_WEBHOOK_URL` is unset, delivery is skipped and it stays green. **A missing webhook is a gap in configuration, not a check result**, and must not hide the event that was to be reported. Replacing the destination takes only the last 2 steps of `notify.yaml` and each caller's `secrets:` line (the first half is transport-independent).

**This is the repository's only `workflow_call`.** Other shared pieces are composite actions, but a composite action runs inside the caller's job, so the webhook would ride on "the runner that just unpacked the dependency tree it scanned". A `workflow_call` always takes its own runner, and this file does not check out the repository.

Note that `make actions-comment-secret-lint` judges this call by **whether the callee posts** (`notify.yaml` does not post, so the caller does not become a posting job). Remote reusable workflows cannot be resolved, so as before they fail with exit 2.

# Security Operations

Defines **dependency updates (Dependabot + cooldown) / secret scanning (gitleaks) / vulnerability scanning (two-stage Trivy fs, two-stage OSV, CodeQL, Opengrep) / the dependency audit gate / the dependency diff gate / data-flow inspection / measuring supply-chain posture / SECURITY.md / defense in depth**. Mechanisms that assume container delivery are out of scope because of no-Docker ([0011](0011-no-docker.md)) and are recorded as exclusions. SHA pinning of Actions is a CI-hardening subject and is owned by [0153](0153-ci-configuration.md).

## Status

Accepted (partial exclusion)

## Context

What is protected splits into four — the dependencies brought in / secrets that land in history / the code we wrote ourselves / CI definitions and the repository's own settings. None of them is visible to the tools of the other layers, so each is held per layer as **defense in depth** (SAST + secret scanning + dependency vulnerabilities + diff gates), and each layer decides "fail / only show". `pnpm audit` when adding a dependency is defined by [0004](0004-library-management.md); this ADR settles its CI gate side.

## Decision

### 1. Dependency updates = Dependabot + cooldown (Renovate not adopted)

- **Dependabot is adopted** (Renovate is not. **Reversal condition**: when Dependabot drops cooldown, or when Dependabot no longer covers an ecosystem this repository handles — cooldown is the very implementation of the quarantine this ADR lays down, and switching to an update mechanism without it would mean withdrawing the quarantine. **"More configuration freedom" is not a condition**). Cooldown (the number of days to wait before opening an update PR) is set per semver level:
  - **patch = 5 days / minor = 7 days / major = 30 days** (default 5 days). The `github-actions` ecosystem uses the default of 5 days
  - **Security updates skip the cooldown** and get a PR immediately
- Ecosystems are **`npm`** (+ `github-actions`). One ecosystem = one grouped PR, with an open PR limit, weekly. Major updates get a separate PR (consistent with [0004](0004-library-management.md))

#### 1.1 Cooldown for mise-managed tools (manual pin)

The pins in `mise.toml` ([0003](0003-version-manager.md)) are outside Dependabot's scope, and bumping is manual. **The same quarantine principle applies**: the window is proportional not to the blast radius but to **upstream detection latency**. The purpose is to wait out the time from a malicious version being published to it being withdrawn, which is a separate matter from what that tool could break.

- **PyPI (`pipx:` backend) = 7 days**. Derived on the same grounds as npm (a public registry where detection and withdrawal of malicious packages turn around at a similar speed)
- **GitHub Releases (`aqua:` / `ubi:` backend) = 14 days**. Same distribution path as Actions pins (`ACTIONS_PIN_MIN_AGE_DAYS`, [0153](0153-ci-configuration.md)), with matching detection latency, so the same window applies
- A bump takes not "the latest" but **"the latest that satisfies the window"**. A pin that deliberately took the previous version because of the window says so in a `mise.toml` comment (otherwise the next person bumps it unconditionally as an "old pin")
- **What the quarantine buys is time, not proof of a version's age.** All that can be read are the release's publication time and the commit's date; neither speaks for the resolved SHA itself, and even both together can be defeated by the intended publisher. The window is a delay against automated compromise, not a guarantee
- **npm registry (`npm:` backend) = 7 days**. Same grounds as PyPI
- **Language runtimes (`core:` backend) are excluded from the window — as an accepted risk.** A tainted distribution is not a story of one dependency being hijacked but **a failure of the language's trust model itself**, and there is no guarantee that waiting brings detection around. The window is a delay against automated compromise and does not work against this shape. **They go on the inventory, but the window does not fail them.**
  > **Do not route "excluded" and "could not be looked up" to the same exit.** The former is something we decided not to check; the latter is a check that did not hold, and the latter fails ([0157](0157-inspection-declaration-discipline.md))
- Exemptions are written in the comment directly above the pin, with **the reason and the date the window opens**. Exemptions without a date, and exemptions left on a pin that already satisfies the window, fail (3.4 below)

#### 1.2 The window is a proxy and can be lifted by direct evidence

**Waiting is a cheap proxy for four questions.** What the window buys is "the time until upstream notices and withdraws", and the questions someone is supposed to answer in that time fold into the following four.

1. **Did the publisher change** — is it the same maintainer / committer / owner as the previous version? Does the publishing frequency follow the history?
2. **Does the artifact match its source** — do provenance and transparency logs tie the artifact to a named source commit?
3. **What actually changed** — is the diff from the previous version proportionate in size and content to the release notes?
4. **Did new dependencies or permissions appear** — new dependencies, new execution entry points, widened permissions

**If these four are answered with direct evidence, the purpose of the window is satisfied.** It is stronger than counting days. Conversely, **skipping both** (no evidence and not waiting out the window) is the one combination that is not allowed.

**An axis that could not be answered is not counted as "no problem".** Evidence that could not be obtained is not evidence of absence; that axis is reported as unanswered — [0157](0157-inspection-declaration-discipline.md)'s rule that a check that did not hold is never folded into "no violations" applies here too. That the axes that can be answered differ by ecosystem is **a structural asymmetry, not a defect of the check** (some have transparency logs, others only mutable tags).

**These four do not measure "how much breaks".** For the same reason that the window's length is proportional to upstream detection latency, the size of the impact is a separate quantity. Mixing them muddies both numbers.

> Enforcement: `make tools-cooldown-check` (pins moved by the diff) / `make tools-cooldown-audit` (weekly, all of them). The window values are held by variables in `.makefiles/`, and GitHub Releases read the same variable as Actions pins directly — holding "the same window" through structure rather than prose

**Tools that distribute agent skills get one more review item**. Libraries land in build artifacts, but this kind of tool **runs with the developer's privileges and decides for itself what to send off the machine**. So on a pin bump, besides the version number, the following two are also reviewed.

- **Changes to the CLI surface** — if upstream adds a subcommand, the range that the deny list in `.claude/settings.json` is supposed to block silently becomes a hole. This is why deny entries are written as patterns rather than an enumeration of platform names ([0154](0154-claude-skills-operations.md) on external skills)
- **Consistency with documentation that transcribes the tool's behaviour** — `.claude/README.md` writes defaults, the paths by which APIs are called and the removal procedure as facts of the pinned version. When the version moves, the same places go stale

### 2. Secret scanning = gitleaks (fail-closed)

- Secrets are scanned with **gitleaks**. Detection rules build on `useDefault`
- It runs in **both pre-push ([0151](0151-git-hooks.md)) and CI**. On detection it is **fail-closed**. The hook and CI call the same `make secret-scan` (aligning behaviour locally and in CI)
- **What is scanned is "the range of commits about to be sent"** (`gitleaks git` + `--log-opts`). A snapshot of the working tree (`gitleaks dir`) is not adopted. There are two reasons, both because it **diverges from the boundary we want to protect**:
  - **It misses things**: a secret deleted from the working tree after being committed remains in history as a blob and is pushed. It does not show in a snapshot
  - **It produces false positives**: it detects as secrets gitignored files that are not pushed (local-only `.env*` placed outside `env/`, etc.; the five `env/.env.*` files are tracked and do not fall here — [0030](0030-environment-variable-management.md)). If legitimate local secrets stopped every push, it would invite habitual `--no-verify`, and fail-closed would become an empty form
  - When there is not a single remote-tracking ref (such as a first push that has never fetched from the remote), the whole history becomes the target. That is the direction of widening the target, not of missing things
- **Scanning the entire commit history is held by a scheduled CI run**. It is for picking up secrets buried in merged history; it grows in proportion to the number of commits, so it is not put on the hook. **Reversal condition**: when scan time stops being proportional to the number of commits — when diff scanning or caching comes in. **That it is fast as measured today is not a condition** — repository growth will break it for certain
- Detected values are not output to logs (`--redact`). The hook / CI logs themselves would become a secondary leak path
- **`useDefault` brings along gitleaks's own global allowlist**. node_modules / various lockfiles / `.svg` and so on are unconditionally excluded from scanning, and this cannot be cancelled from `.gitleaks.toml`. Cancelling it would mean owning every rule ourselves and losing the ability to follow updates to the default rules, so **following updates takes priority, and the excluded range is accepted with awareness of it** (**reversal condition**: when gitleaks provides partial cancellation of the default allowlist, or when a case is published of a real secret ending up in an excluded target (lockfiles, etc.)). Our own exclusions, such as generated types ([0072](0072-api-type-generation.md)), are added following the suppression policy below once a false positive actually occurs

### 3. Vulnerability scanning (defense in depth)

- **CodeQL SAST**: `languages: javascript-typescript`. Trigger = PR + push to protected branches + weekly cron. SARIF is uploaded with `security-events: write`. High severity blocks merging (the substance of the block lives in the required settings of branch protection / code scanning; it does not rely on a hard fail inside the workflow)
- **Portable SAST (Opengrep)**: the default for SAST is held as **something that can be carried along with the repository**. The analysis that GitHub's code scanning supplies **cannot be taken outside GitHub**, and in a private configuration without GHAS that whole layer disappears, so **a portable implementation that answers the same question** is held. It is a single binary pinned in `mise.toml`, run by the same `make sast` locally and in CI. **Opengrep, an OSS fork, is adopted rather than Semgrep itself** — the rule syntax is compatible and `// nosemgrep:` suppressions keep working, and no licensing judgment is passed on to the user. **Keeping a baseline of 0 findings is the premise of this gate**; precisely because it is 0, a new finding is a signal rather than something to skim past. Accepted findings are placed in the source as `// nosemgrep: <rule-id>` with a reason, leaving the judgment on the code's side. **The inspection conditions (targets, rules, exclusions) are held in one place** — if the gate and the import into code scanning pointed at different scans, what failed and the list in the Security tab would disagree. **Rules are not drawn from the registry (semgrep.dev)** — the registry's set is under the Semgrep Rules License v1.0 and limited to internal use, and **even with only the engine swapped for OSS, as long as rules are drawn from there, the licensing judgment passes to the user**. Instead, `opengrep/opengrep-rules` is read **pinned to a commit**. The categories taken, digest matching, and the way of taking them without placing test samples are owned by [Do not pull SAST rules from a registry](../../.github/workflows/README.md#do-not-pull-sast-rules-from-a-registry)
  - **A Node / JS-specific SAST (njsscan) is not held as a layer.** The rule set above covers the same surface, and stacking it adds no findings. **The reversal condition is when this rule supply stops covering Node / Express-specific patterns** — the rules njsscan bundles derive from semgrep-rules before the license change, so the Node-oriented surface alone can be brought back without drawing from the registry. **"One layer fewer" is not a condition** — what was reduced was an overlapping layer
- **Edit-time SAST (eslint-plugin-security)**: the layer that answers the same question as the two above **during editing, with types resolved**. If scanning existed only in CI, findings would arrive after the push. However, **following the capability-based division of labour in [0002](0002-formatter-linter.md), the recommended preset is not applied** — applying the bundle would bring in, at once, rules overlapping biome and rules with no target in this layer. **Only rules that can keep a baseline of 0 are enabled**, and the dropped rules and the reasons are written in `eslint.config.ts` (ReDoS and path traversal continue to be borne by Opengrep / CodeQL, so dropping them does not remove the inspection surface). A dropped rule comes back only when it starts looking at substance rather than shape — for example, if `detect-unsafe-regex` came to judge by actual backtracking complexity rather than the shape of nested quantifiers, `/^\d+(\.\d+)?$/` would stop firing and 0 could be kept. "The SAST layer is thin" is not a reason
- **External analysis service (SonarQube Cloud)**: unlike all the above, the only layer that **depends on an external account**. It is free for public repositories and paid for private ones, so **it is designed with no contract as the default** — if `SONAR_TOKEN` is not set, the whole analysis job steps down, and **it states "not configured" on the PR while staying green** (the absence of a comment is indistinguishable from "the check was green"). **It is not registered as a required check**. Whether a third party's account exists must not become a condition for merging. **It is not a target of stripping** — whether to keep it is a judgment for whoever knows whether a contract exists, and is chosen in one step of [`docs/get-started/setup-repository.md`](../get-started/setup-repository.md). `projectKey` / `organization` are repository identifiers, so they are rewritten by `make setup-replace-repository-reference` as **identity**, not as settings
- **Two-stage OSV**: it **consults a different database** from Trivy / `pnpm audit`. The counts do not match, which is itself an instance of "the union is authoritative" below. The two-stage shape is the same as Trivy's, split into **a report (every PR, never fails) and a promotion gate (PRs targeting protected branches, fails on detection)**
- **Dependency diff gate (Dependency Review)**: the three above all read **the current state of the tree**, so they cannot distinguish vulnerabilities held from before from ones this change brought in. The former are something a report-only gate structurally has to tolerate, so **a layer that asks only "did this PR add any"** is placed separately. Whoever added it can take it back, so this one may fail. The threshold is `high`, aligned with the dependency audit gate. The API it calls is free only for public repositories and requires a Code Security license for private ones — **this is a configuration decision, not a code decision**, so the layer is distributed, and whether to remove it is chosen in one step of setup
- **Data-flow inspection (Bearer)**: looks at **the points where a value leaves the process (log lines / outbound requests / third-party clients)** together with the classification of what that value is. Patterns and taint paths do not answer this question — neither knows that a string reaching the logger is an email address. **It does not fail** (3.2 below)
- **Language-agnostic regex inspection (DevSkim)**: having no language front end, it **reads every file with one rule set**. Opengrep and CodeQL only open languages they can parse, so weak cipher names and hard-coded credentials in **files neither opens** (YAML that is not a workflow / JSON / plain text / Markdown in `docs/`) are caught by no other layer. **It does not fail** (3.2 below)
- **Measuring supply-chain posture (OpenSSF Scorecard)**: measures neither code nor dependencies but **the repository's own settings** (branch protection / dependency pinning / token permissions / whether a security policy exists). **The posture itself is the deliverable**, and it is held as declaration files and a setup procedure (`make setup-repo`) — **generating from the template copies only the tree; neither branch protection nor token permissions are duplicated**, so what is handed over is not the settings themselves but the procedure that applies them. It is a property of the repository rather than of a change, so it does not run on PRs and is not registered as a required check. **Results are not sent to the public dataset (`publish_results`)** — that is a judgment about the repository's name, not a technical one, so it is not decided here
  - **Raising the score is not the goal.** A low measured score and not being protected are different things — **a low score is not a reversal condition for any decision** ([0140](0140-documentation-operations.md)). Three signals are deliberately left capped, each decided by whether there is a target, not by the score
    - **`Branch-Protection`** — reading it fully requires a standing credential, and the decision not to place one comes first ([0153](0153-ci-configuration.md) on where tokens are issued from). The substance of the protection is declared by [`.github/settings/branch-protection.json`](../../.github/settings/branch-protection.json)
    - **`Fuzzing`** — no fuzzing is held. **The reversal condition is when the core comes to have a layer that itself parses byte sequences coming from outside**. What the current presentation layer parses are values that passed through types generated from the contract, and it holds no parser itself — there is nothing to fuzz ([0090](0090-testing-strategy.md))
    - **`CII-Best-Practices`** — the OpenSSF Best Practices badge is not obtained. **The reversal condition is when this repository moves to public operation as a product in its own right rather than as a template**. The badge is tied to the registered *repository name* and does not move to a duplicated tree ([0142](0142-license.md))
- **Static analysis of Actions definitions (zizmor)**: the layer whose target is what CI executes. The three above, which look at application code and dependencies, do not look at the `run:` steps or permission grants written in `.github/**`. It runs with `--offline` in **both the hook and CI**, and is **fail-closed on high findings**. `--min-severity` also narrows the display, so the run that outputs every finding and the gate run are separated, keeping downgraded findings from disappearing from the output. Suppressions are declared with reasons in `.github/zizmor.yml` and follow the suppression policy of 4 below (the inspection's responsibility and how it fails are authoritative in [0153](0153-ci-configuration.md))
- **Two-stage Trivy fs operation**:
  - **Dev gate** (every PR, advisory): `scan-type: fs` / `severity: CRITICAL,HIGH,MEDIUM` / **`ignore-unfixed: true`** (ignore what cannot be fixed) / no hard fail + PR comment
  - **Release gate** (PRs to protected branches only, strict): made strict with **`ignore-unfixed: false`** (also making the unfixed visible). **This single point is the only thing that blocks**
- **Dependency audit gate**: **`pnpm audit` is the default**. A reachability filter — narrowing blocking down to only what has a code path actually reaching the vulnerable function — **cannot be implemented with current tools**, because `pnpm audit` has no such feature and osv-scanner's call analysis does not support JS/TS. So the blocking threshold is defined by **severity (`high` / `critical`) and fixability (fixable)** (unfixed (unfixable) findings tend to be noise and are treated as advisory; fixable high and above are blocking). The operational SLA (start addressing `high` and above within 48 hours) keeps the default of [0004](0004-library-management.md); this item defines the blocking threshold on its CI gate side
- **When detections disagree between scanners, the union is authoritative**. Trivy fs and `pnpm audit` differ in counting unit (per CVE / per advisory) and in scope, and return different counts for the same repository. Treating only one as authoritative makes the area that tool does not look at (e.g. `pnpm audit` looks only at the npm advisory DB) a permanent blind spot. **Anything that reaches the blocking threshold in either one is treated as blocking**. That the two counts do not match is not itself an anomaly, so no attempt is made to reconcile them and erase the difference

#### 3.1 Vulnerability scanning is not a push gate

`make trivy-fs` can be run manually locally, but **is not connected to the pre-push hook** ([0151](0151-git-hooks.md)). This is not a state-dependent judgment like "there are many findings right now", but a judgment that **it does not hold together as the shape of a gate**.

- **It cannot be resolved on the spot**. A leaked secret can be resolved by the person involved alone, by removing the value and committing again. A dependency vulnerability cannot be resolved unless upstream has published a fix, and even then, if upstream pins the transitive dependency, the only option is to create a combination outside upstream's verification with `pnpm.overrides`. **A gate you cannot pass by your own effort is not a gate but an obstacle**, and it trains habitual `--no-verify` (exactly the state [0151](0151-git-hooks.md) forbids)
- **Its state changes independently of changes**. When a CVE is published, a push that changed not a single line gets a different result from yesterday. **A signal that fluctuates regardless of the change cannot be put on a gate whose target is the change**
- **The authority to decide is not present there**. "Ship with this vulnerability" is a judgment someone has to take on, and that holds only at promotion (PRs targeting protected branches). A push is not a place for judgment

For the same reason, vulnerabilities are reported to **PR comments**. Hook output is not reviewed and leaves no record, so it does not function as a report either.

That secret scanning conversely meets every condition (resolvable on the spot, determined together with the change, no room for judgment) is why the two are treated differently.

**Reversal condition**: when the first two of the three points above disappear — a mechanism comes in by which the person involved can resolve a vulnerability on the spot, or the property of results fluctuating independently of changes disappears. **A drop in the number of findings is not a condition** (that is a state; not one of the reasons the gate shape does not hold has moved). The promotion gate side (PRs targeting protected branches) is outside this condition and blocks from the start.

### 3.2 The decision to place layers that do not fail

**Not every layer is made a gate.** Gates are limited to layers that **can keep a baseline of 0, or that ask only "did this change add any"**. Turning anything else red makes red the normal state, and the habit of stopping when seeing red breaks first.

So the layers split into three kinds of wiring.

| Wiring | Applies to | What turns it red |
| --- | --- | --- |
| **Gate** | gitleaks / Opengrep / eslint-plugin-security / dependency audit / the promotion side of Trivy and OSV | The job's own exit code |
| **Gate** | Dependency Review | The job's own exit code |
| **Report only** | The report side of Trivy and OSV | Nothing turns red (it fails only when the scanner did not run) |
| **Sent to code scanning** | Bearer / DevSkim | GitHub's diff check against **findings newly brought in by that change** |
| **Sent to code scanning** | CodeQL / SonarQube Cloud | Same as above |

The third is wiring that separates "does not fail" from "does not show". The job returns green, but **alerts brought in by the diff turn the PR red**. Layers whose baseline cannot be made 0 — those with a strong tendency toward false positives, which would need per-rule disabling to get to 0 — go here. Per-rule disabling is forbidden by 3.4 below.

### 3.3 Because there is a schedule, PRs can be narrowed

The Security group runs on **a weekly schedule + PRs whose diff reaches it**. The weekly run exists because CVEs can be published even against a tree where not a single line of code moved, which inspections triggered by changes alone cannot reach.

**And precisely because there is a weekly run, the PR side can be narrowed.** Each job decides whether the diff reaches it and steps down ([0153](0153-ci-configuration.md)). **The meaning of narrowing is not "the scan disappears" but "it moves to the weekly run"**, and stopping the weekly run would make this narrowing invalid. Forgetting to write a condition loses at most one week and does not become a permanent blind spot. That the Security group's jobs are not registered as required checks is also one of the premises: stepping down does not stop the PR.

**There are layers that may step down and layers that must not.**

| Layer | Steps down? | Reason |
| --- | --- | --- |
| Report only (the report side of Trivy / OSV) | Steps down | If the lockfile has not moved, the scanner's answer does not change |
| Dependency audit gate (`pnpm audit`) | Steps down | A verdict inherited from base cannot be resolved on the spot by the author of the change (3.1 above) |
| Promotion gate (the release side of Trivy / OSV) | **Does not step down** | Promotion is where someone takes on the current state of the tree, and that the PR's diff does not touch the lockfile is no reason not to take on the vulnerabilities the tree holds |
| Layers sent to code scanning (the third wiring of 3.2) | **Decided separately per layer** | Alerts are closed by GitHub, and only by "a later analysis no longer reports it". On a PR that stepped down, the occasion for closing is delayed until the weekly run — for a layer whose verdict is entrusted to GitHub, before stepping it down by the same diff condition as other layers, ask for that layer whether that delay is acceptable |
| CodeQL | **Does not step down** | Code scanning alerts close only by "a later analysis no longer reports it". Reducing the number of runs can drop occasions for closing |

### 3.4 Suppression (ignore) policy

The means of tolerating a scanner's detection is limited to dedicated suppression files. The same policy is stated at the top of every file, aligning their format.

| File | Unit of suppression |
| --- | --- |
| `.gitleaks.toml` | Detection rule set and path-level allowlist |
| `.gitleaksignore` | One detection (fingerprint `<path>:<rule-id>:<line>`) |
| `.trivyignore.yaml` | One vulnerability ID (paths limited with `paths`). The expiry field is `expired_at` |
| `osv-scanner.toml` | One vulnerability ID (`reason` is required). **The tool leaves filtered findings in its output with their reasons**, so suppression and silencing can be told apart. The expiry field is `ignoreUntil` |
| `sonar-project.properties` | A pair of one rule × a path (`sonar.issue.ignore.multicriteria`). **SonarCloud has a mechanism for reviewing hotspots in its UI, but it places the decision outside the repository** — the same judgment would not carry over to a duplicated repository, so the suppression the repository holds is limited to this file |
| `bearer.ignore` | One detection (fingerprint). The reason goes in `comment`. **It is JSON, so the policy statement at the top cannot be placed** — the format is decided by `bearer ignore add`, and each entry holds its reason |
| `.github/zizmor.yml` | One file (`ignore`). **An audit that cannot be narrowed by file is remapped in severity (per audit ID)** — composite actions are all `action.yaml`, and `ignore` matches on base name, so listing one silences every composite action (a limitation of zizmor 1.29.0; the remap is withdrawn once per-file remapping arrives) |
| `mise.toml` | One pin (the comment `tools-cooldown-ignore:` directly above it). **Always add the date the window opens** — a quarantine exemption can state its removal condition only as a date |
| `pnpm-workspace.yaml` | One quarantine exemption (`<name>@<version>` in `minimumReleaseAgeExclude`). **Name the version, and write the reason and the date the window opens in the comment directly above** — a name-only exemption lets every later version of that dependency through |

- **Source-side suppression is limited to one line**. `// nosemgrep: <rule-id>` (Opengrep) and `// DevSkim: ignore <rule-id>` (DevSkim) are the formats of scanners without a suppression file, and they satisfy this policy because they can be narrowed to **one rule × one line**. The reason is written on the spot. **DevSkim reads only what is placed on the same line as the finding** — placing it on the preceding line silently has no effect, and the finding you thought was suppressed keeps remaining in the Security tab
- **Suppressed findings are not passed to code scanning**. Opengrep leaves findings removed with `// nosemgrep:` in the SARIF with `suppressions`, and GitHub does not treat them as closed alerts. Passing them would **leave the gate green while findings pile up only in the Security tab**, collapsing the separation of "does not fail" and "does not show" from 3 above toward the unintended side. They are dropped before import (`scripts/sarif`)
- **Disabling rules or scanners wholesale is forbidden**. Suppression is limited to the file unit or the fingerprint unit. Suppression that does not narrow its range **lets new files and dependencies that hit the same detection pass straight through as well**
- **When it cannot be narrowed to the file unit, stop at lowering the severity rather than suppressing**. What the prohibition above protects is avoiding "new things silently passing through"; with a downgrade, the inspection keeps running and only the gate is passed. **For that, the downgraded findings must remain in the output** — if they do not, it is indistinguishable from suppression. The tool lacking a file unit is the only reason to choose this, and **the reversal condition (revert once the tool supports it) is written on the spot**
- **Every entry always carries a reason** (for gitleaks, "why it is not a secret"; for Trivy, `statement`). What cannot be given a reason is not suppressed; remove the value itself or upgrade the dependency
- **Vulnerabilities without a fixed version get a deadline through the expiry field that surface holds** (table above). From the day it passes, the scanner itself removes the suppression and the gate fails, and a person decides again whether to extend it. Dates are not copied into the reason — the weekly reconciliation below reads the expiry field and gives it priority over a date written in the reason. A declaration where an expiry field and a date in the reason sit side by side, and a declaration whose expiry field cannot be read as a calendar date, are reported as format defects
- **Delete it when conditions change**. Not a permanent allowlist. **Once a week, declarations are reconciled against their conditions** (`make suppression-expiry` / `.github/workflows/suppression-expiry.yaml`). Condition dates are written as calendar dates in Japan time, and the reconciliation judges by the same calendar date (no time of day is brought in — taking UTC would shift the verdict by a day only for runs in the hours that straddle the date). **Without a mechanism that looks, declarations past their deadline keep remaining, and the next person to use the same slot takes the deadline itself lightly.** **There are two limits, and the report states them explicitly.** A machine can decide only dates, so a list of every entry accompanies it — silently dropping conditions it cannot decide, such as "when upstream requires N or later", erases the point of having written the condition. **Surfaces whose format puts the reason in a comment (`.gitleaks.toml` / `.gitleaksignore` / `.github/zizmor.yml` in the table above, and the cooldown and overrides in `pnpm-workspace.yaml`) cannot be read per declaration** — the parser drops comments, so only lines containing dates come out
- The validity of a suppression itself remains a human judgment at review time. What a machine can enforce goes only as far as "the suppression follows the formats above"
- **This policy reaches only suppressions this repository wrote itself**. The global allowlist that gitleaks's `useDefault` brings along (see 2 above) and Trivy's own default exclusions are embedded on the tool side and do not appear here. **"The suppression file is empty" does not mean "nothing is excluded"**

**SonarQube Cloud is the exception to this format, and the reasons for its suppressions are not written anywhere else in the repository.** This layer is one whose removal can be chosen, and if it is chosen, `sonar-project.properties` and `.github/workflows/sonarcloud.yaml` disappear together. Placing reasons anywhere else — in source comments or in documents that survive the removal — means that **after the flagged rules vanish, only the reasons remain, and nobody can trace what they are about**.

The same applies when changing the shape of code in response to this inspection's findings: **neither the rule name nor "Sonar said so" is written in comments**. A constraint worth keeping can be written as a property of the place without naming the rule; if it cannot, it is a reason only the suppression file should hold.

### 3.5 CSP conformance gate

- **CI checks that the delivered headers match the declaration of [0111](0111-csp-security-headers.md)**. It obtains the response headers of the build artifacts / the started app, matches the presence and values of CSP and the main security headers against the declaration, and is fail-closed
  - > Rationale: [0111](0111-csp-security-headers.md)
- The targets are CSP and the accompanying headers 0111 defines (`Strict-Transport-Security` / `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy`, etc.). **What is checked is "the declaration matching actual delivery"**; the content of the headers themselves is authoritative in 0111
- The implementation is placed as one job in the Security group of [0153](0153-ci-configuration.md)
- **The means is an OWASP ZAP baseline scan**. Only a DAST running inside the runner can hit an app that exists only inside the runner. Baseline rather than api-scan is adopted because this repo is a presentation layer with the API owned by a separate repository, so an OpenAPI-driven scan has effectively nothing to hit
- **The official `zaproxy/action-*` actions are not used**. `docker_name` accepts a tag, not a digest, while this repo pins container images by digest and matches them with `make images-pin-check` ([0011](0011-no-docker.md)), and the action's input is outside that scan's target. **Do not add pins that look fixed while nobody checks them**
- **Detection of violations on the browser side is held by the E2E watch**. What ZAP reads is headers, and the result of the browser enforcing those headers (that loads not in the declaration were refused) only appears in a real browser. `e2e/lib/test.ts` counts `securitypolicyviolation` across every spec, and that enforcement is in effect is shown by pointing at an origin not in the declaration and having a violation reported (`e2e/journeys/csp.spec.ts`). Checking headers and detecting violations are separate facts, and neither alone closes the loop
- **The gate is placed before the implementation, and known gaps are held as a list**. A permanently red required check stops every PR, including the PRs that shrink that list, so only the findings appearing now are listed in `.github/zap/rules.tsv` with reasons and reversal conditions, and **findings not in the list turn it red**. ZAP keeps the count, rule names and URLs of rules set to `IGNORE` in its output too, which satisfies "the downgraded findings remain in the output" of 3.4 above. **Adding the measuring side later makes its introduction subordinate to completing the implementation, and the list of what is missing is never obtained until the end**
- **CI deployments start with the bundled tag manager's container ID empty (exclusion)**. The branch that adds the delivery origin to `script-src` and lowers `Cross-Origin-Embedder-Policy` ([0131](0131-cookie-consent.md) / [0111](0111-csp-security-headers.md)) is exercised by neither e2e nor DAST. **This is a choice to keep CI from hitting external delivery origins** — placing a check that hits a real container would mix external availability and changes to the container's contents into CI's colour. Assembly of the headers and the loading strategy are pinned by unit tests for both deployments, and what is not guaranteed is only that the assembled headers take effect in a real browser as declared. The reversal condition is when a means of verifying CSP enforcement without going outside (such as a check in a form where the delivery origin can be swapped) comes in

### 4. SECURITY.md

- **A `SECURITY.md` is placed**. It defines the vulnerability reporting flow (directing to Private Vulnerability Reporting / contact / Supported Versions) (the contact is a placeholder to replace)
- Verification of release artifacts (cosign / provenance / SBOM) is **not included**, because the delivered artifact is not a container image (exclusion below)

### 5. Release gate vs dev PR gate

- **Dev PR = leaning advisory** (Trivy `ignore-unfixed:true` / audit only actionable / CodeQL and gitleaks fail-closed), **release (PRs to protected branches) = made strict** (Trivy `ignore-unfixed:false`; the severity list is the same as dev, and the difference is making the unfixed visible). These two stages ride language-independently (the Security group of [0153](0153-ci-configuration.md)). The substance of Trivy / CodeQL merge blocking is placed on the required check / branch protection side ([0150](0150-git-workflow.md))

### 6. Repository-originated strings that enter an agent's context

- **Any entry point that puts strings stored in the repository into an agent's context makes them identify themselves as data.** The targets are hooks' `additionalContext`, the ledgers, indexes and declaration files that skills and agents load, and summaries assembled from them — **paths by which repository contents become model input as is**. Put the data first and instructions after, and have the data side state "not instructions"
- **Strip control characters.** Leaving newlines or escape sequences lets them be read as a separate paragraph or a separate speaker inside the envelope
- **JSON escaping is not regarded as a countermeasure.** What `JSON.stringify` guarantees is only that the envelope does not break; the moment the consuming side calls `JSON.parse`, the contents revert to the original string and enter the context as is
  - > Rationale: whoever wrote that spelling is not the requester of the session that reads it. This repository is public, and file names and ledger entries can be brought in through ordinary PRs. **Instruction-like free text can be disguised as "a plausible reason", and is hard to see through for reviewers reading from a design or architecture viewpoint**. It takes effect later, the moment an unrelated, separate session touches the same file
- **It is not treated the same as values from outside the repository.** This lies outside the line that [the presentation layer does not sanitize values that came from upstream](0070-backend-role-separation.md). What is protected here is not the browser at the delivery end but **the agents working in this repository themselves**, and the one who produced the value is this repository

## Exclusion (out of scope under no-Docker)

Because of [0011](0011-no-docker.md) (no-Docker / delivery via PaaS or static CDN), this repo **does not adopt** the following mechanisms that assume container delivery:

- ❌ **Container image scanning** (Trivy image / SBOM generation) — there is no Docker image of the application itself
- ❌ **Image signing with cosign / SLSA provenance / SBOM attestation** — the delivered artifact is not a container image
- ❌ **Dependabot's `docker` ecosystem** — there is no Dockerfile to audit (only `npm` + `github-actions`, as in 1 above)
- These are recorded as "deliberately not done" decisions (the taxonomy of [0140](0140-documentation-operations.md): exclusion = ADR). If you do your own container delivery, add them according to your use case

## Prohibitions

- ❌ Using Renovate alongside (unified on Dependabot) (Enforcement: none — a decision not to adopt. No Renovate configuration file is placed, and using it alongside appears in the diff as its addition)
- ❌ Applying cooldown to security updates (immediate PR) (Enforcement: Prose — **not mechanizable**. How cooldown applies to security updates is decided by Dependabot's behaviour and does not appear in the repository's settings)
- ❌ Concatenating repository-originated strings into an agent's context with no enclosure or label (Enforcement: Prose — **partly mechanizable**. Whether the strings a hook outputs to `additionalContext` go through labelling and control-character stripping could be rejected by a gate reading the hook's script, but no rule exists. Which of the ledgers that skills and agents read enter the context is not determined by the shape of the code)
- ❌ Not making gitleaks / CodeQL detections fail-closed (secrets and SAST high always block)
- ❌ Making the dependency audit "hard-fail uniformly for every severity" (only fixable `high` / `critical` block = noise suppression; a reachability filter cannot be implemented for JS/TS) (Enforcement: `scripts/audit-gate/advisories.test.ts` (pins that high without a fixed version and moderate do not block))
- ❌ Bringing image-scan / cosign / SBOM / provenance into this no-Docker repo ([0011](0011-no-docker.md)) (Enforcement: none — a decision not to adopt. Neither jobs nor settings for image-scan, signing or SBOM are placed, and bringing them in appears in the diff as added workflows)
- ❌ Leaning SAST on CodeQL alone (a layer that cannot be carried out is not made the only SAST) (Enforcement: Prose — **mechanizable** (a gate rejecting unless a workflow has a job calling `make sast`; no rule exists))
- ❌ Adopting Semgrep itself (no licensing judgment is passed to the user; unified on Opengrep) (Enforcement: none — a decision not to adopt. Semgrep itself is not pinned, and adopting it would appear in the diff as an addition to `mise.toml`)
- ❌ Making a layer whose baseline is not 0 a gate (choose from the wiring of 3.2) (Enforcement: Prose — **not mechanizable**. Whether the baseline is 0 is decided by the number of findings when the scanner runs and does not appear in the shape of the code)
- ❌ Disabling a scanner's rules or checks wholesale (suppression is limited to the formats of 3.4) (Enforcement: Prose — **partly mechanizable**. The appearance of rule-exclusion spellings (exclusion flags, rules set to `off`) in scanner invocations or settings can be picked up statically, but no rule exists. Whether that narrowing is wholesale is a judgment of range)
- ❌ Placing a suppression entry with no reason written

## Notes

- Scanner versions have `mise.toml` as their SSOT ([0003](0003-version-manager.md)). The hook and CI use binaries of the same version
- Security workflows are added to `.github/` under user instruction (AGENTS.md AI Modification Scope)

## Related ADRs

- [0153-ci-configuration.md](0153-ci-configuration.md) — CI integration of the Security group (the execution foundation of this ADR). SHA pinning of Actions is also there
- [0004-library-management.md](0004-library-management.md) — `pnpm audit` / exact pin / separate PRs for majors (the foundation of the dependency audit)
- [0151-git-hooks.md](0151-git-hooks.md) — stage responsibilities of pre-push (the first stage that runs this ADR's scans)
- [0003-version-manager.md](0003-version-manager.md) — version declarations for gitleaks / Trivy (`mise.toml` is the SSOT)
- [0011-no-docker.md](0011-no-docker.md) — no-Docker (the grounds for excluding image-scan / cosign / SBOM)
- [0072-api-type-generation.md](0072-api-type-generation.md) — the generated artifacts `src/adapters/gen/**` (allowlist candidates if false positives appear)
- [0150-git-workflow.md](0150-git-workflow.md) — protected branches (the target of the release gate)

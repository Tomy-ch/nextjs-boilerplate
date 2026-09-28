---
name: dep-vuln-upgrade
usage-class: situational
description: >-
  Move only the npm dependencies a security advisory (CVE / GHSA) names to a fixed version — a direct
  dependency by its exact pin in `package.json`, a transitive one by an `overrides` entry in
  `pnpm-workspace.yaml` — and hand every version the release-age window catches to `/supply-chain-triage`.
  Use it when someone pastes a `pnpm audit` / Trivy / OSV / Dependabot finding or a list of
  "package current → fixed (GHSA)" lines, when the `dependency-audit` job fails on a fixable high, or on
  「この脆弱性を塞いで」「GHSA-xxxx を直して」「この CVE の修正版に上げて」. Do NOT use it for a routine bump of everything (Dependabot),
  for `mise.toml` pins (`/tools-upgrade`), Node.js (`/node-upgrade`), Actions pins (`/actions-pin`), or to
  add a new dependency (ADR 0004).
argument-hint: '[advisory list — one "package current → fixed (GHSA/CVE)" per line]'
---

# Dependency Vulnerability Upgrade

This skill takes a list of security advisories and moves **only the npm packages they name** to a
fixed version. It is deliberately targeted: an advisory patch that also drags in unrelated upgrades
is no longer reviewable as a security change, so a neighbour that happens to be outdated is mentioned
and left alone.

Everything it changes passes through the policies this repository already declares — the exact-pin
rule of [0004](../../../docs/adr/0004-library-management.md), the release-age window and the
suppression format of [0110](../../../docs/adr/0110-security-operations.md), and the `overrides`
convention written at the top of that block in `pnpm-workspace.yaml`. **Read those at runtime; this
file restates none of their values.**

A Japanese reference translation is available at `SKILL.ja.md` in the same directory (not loaded as a
skill; for human reference only).

## When to Use

- The user pastes a vulnerability report — `pnpm audit`, a Trivy or OSV finding, a Dependabot alert,
  or a hand-written list — and wants the flagged packages patched.
- The `dependency-audit` job in `.github/workflows/dependency-scan.yaml` fails on a fixable high or
  critical, or the OSV / Trivy report on a PR names something this change should close.
- A Dependabot security update cannot land by itself: the fix is transitive and needs an override, or
  the fixed version is still inside the release-age window.

## Do NOT use this skill for

- **Routine updates.** Dependabot owns the weekly bump (`.github/dependabot.yml`); this skill moves
  only what an advisory names.
- **`mise.toml` pins**, including tools pulled from the npm registry through mise — `/tools-upgrade`.
  Node.js itself — `/node-upgrade`. SHA-pinned Actions — `/actions-pin`.
- **Adding a dependency.** Replacing a vulnerable package with a different one is a new dependency and
  a stopping point in `AGENTS.md`: walk [0004](../../../docs/adr/0004-library-management.md)'s
  selection criteria and paste its template into the PR. This skill ends at "no fix exists" and says so.
- **Judging whether a too-new version is safe.** That is `/supply-chain-triage`; this skill only
  chains to it and carries its band into the decision.

## AI Modification Scope

Invoking this skill is the explicit instruction that relaxes `AGENTS.md`'s protection of
repository-root files — only for the files below, and only for this run.

Permitted:

- The `package.json` of each importer the workspace declares — only the version of a package the
  advisory names, kept an exact pin.
- `pnpm-lock.yaml` — only as the output of `pnpm install --lockfile-only`. Never hand-edited.
- `pnpm-workspace.yaml` — only the `overrides` block, and `minimumReleaseAgeExclude` **after the user
  approved that exact entry** (Step 5).
- `osv-scanner.toml` / `.trivyignore.yaml` — only an entry the user approved for that one advisory.
- Generated artifacts, only as the output of their `make` target (Step 7).

Never, even during this skill:

- The window and the other resolver policies in `pnpm-workspace.yaml` — `minimumReleaseAge`,
  `minimumReleaseAgeStrict`, `minimumReleaseAgeIgnoreMissingTime`, `trustPolicy*`,
  `blockExoticSubdeps`, `strictDepBuilds`, `allowBuilds`, `verifyDepsBeforeRun`, `engineStrict`,
  `nodeVersion`. **They are the policy, not the patch.** Equally never a CLI flag that overrides one
  of them for a single run.
- `AGENTS.md`, Accepted ADR bodies, anything under `permissions.deny`.
- A package the advisory does not name.

## Step 0. Parse the advisories and read the policy

1. Parse the list from the arguments or the latest user message into entries of **package, installed
   version (if given), candidate fixed version(s), GHSA / CVE ids, severity**. Tolerate the common
   shapes (`pnpm audit` blocks, Trivy / OSV rows, one line per package). Merge entries that name the
   same package — one move closes all of its advisories, and the report cites every id.
2. **Resolve the real fix floor from the advisory database, not from the pasted text.** A package can
   carry a second advisory whose first patched version is higher than the one quoted:

   ```sh
   gh api /advisories/<GHSA-id>
   gh api "/advisories?ecosystem=npm&affects=<pkg>"
   ```

   When the database and the list disagree, use the database and say so in the summary.
3. Read `pnpm-workspace.yaml` in full: `packages:` (the importers), `minimumReleaseAge` (**minutes** —
   divide by 1440 for days), `minimumReleaseAgeStrict`, the current `minimumReleaseAgeExclude`, the
   comment above `overrides:` and every existing override entry. An exclusion already naming the
   candidate means the window was opened deliberately for it.
4. Read [0110](../../../docs/adr/0110-security-operations.md) — the tool cooldown, the window as a proxy
   that direct evidence can lift, and the suppression policy. **If the workspace
   declares no release-age window, or one that disagrees with the npm window the ADR sets, stop and
   report the two sources** — two authorities disagreeing is a trip wire in `AGENTS.md`, not a value
   to pick.

State the window you read and where it came from. Do not touch any file before this step is done.

## Step 1. Locate each package

The lockfile decides where a package lives, not its name.

```sh
pnpm why <pkg> -r        # which importers pull it, through which path, at which versions
```

For each entry record:

| Field | How |
| --- | --- |
| importer(s) | the workspace members whose tree contains it |
| resolved version(s) | from `pnpm why` — a package can resolve on several major lines at once |
| direct / transitive | named in that importer's `package.json` → direct; otherwise transitive, with the parent that pulls it |
| exposure | a runtime dependency of an importer that ships (to the browser or the server) vs. dev-time only — read from the `pnpm why` path |

A package absent from the tree is **not-present**: report it and skip it. A package that turns out to
be a `mise.toml` tool, Node.js, or an Action goes to the skill named in *Do NOT use*.

## Step 2. Choose the move

For each present entry:

- **Default: the lowest fixed version on the installed major line.** From a multi-candidate advisory,
  take the one matching the installed major.
- **Major bump** (the installed line has no fix): flag it as potentially breaking. It is asked per case
  (Step 5), and [0004](../../../docs/adr/0004-library-management.md) requires it in its own PR with
  the breaking changes quoted from the CHANGELOG.
- **Downgrade guard:** never choose a version below the installed one; mark such an entry
  `needs-manual`.
- **No fixed version exists:** there is nothing to move. Carry it to Step 5 as `no-fix`.

Then decide the mechanism:

- **Direct dependency** → the exact version in that importer's `package.json`.
- **Transitive dependency** → first check whether a newer release of the **parent** already pulls a
  fixed version; if it does and that parent is itself a direct dependency, moving the parent is the
  cleaner fix and needs no override. Otherwise an `overrides` entry, which by the convention in
  `pnpm-workspace.yaml` **stays inside the range the parent declares**. Read that range:

  ```sh
  pnpm view <parent>@<parent-version> dependencies.<pkg>
  ```

  If the fixed version lies **outside** the parent's declared range, the override would create a
  combination upstream never tested. That is `out-of-range` — asked per case (Step 5), never applied
  on your own.

## Step 3. Apply the release-age gate

Fetch the publish time of the version the move will land on:

```sh
pnpm view <pkg> time --json
```

`npm` itself is not used here ([0001](../../../docs/adr/0001-package-manager.md)).

| Disposition | Condition | Effect |
| --- | --- | --- |
| **clear** | older than the window, or already named in `minimumReleaseAgeExclude` | eligible |
| **blocked** | younger than the window | the resolver rejects it — under `minimumReleaseAgeStrict` resolution fails when no aged version matches, and the check reaches a frozen-lockfile replay, so CI rejects it too. Report when it clears (publish time + window) |

A range selector only moves to the newest **aged** match, so an override can land below the
advisory's floor without failing. Step 7 re-reads what actually resolved.

**Never make a blocked version installable by lowering the window, switching off strict mode, or
passing a flag.** The per-version exclusion is the only door, and it is the user's to open (Step 5).

## Step 4. Triage what the gate caught

For every `blocked` entry, chain **`/supply-chain-triage`**, one invocation per entry, before Step 5.
Pass ecosystem `npm`, the package, the candidate version, **the baseline the lockfile currently
holds**, the window, the disposition, and the advisory that forces the move.

Triage is report-only and returns a band (`LOW` / `MEDIUM` / `HIGH` / `CRITICAL` /
`INSUFFICIENT-EVIDENCE`). The window-versus-evidence judgement is entirely its own
([0110](../../../docs/adr/0110-security-operations.md): the window is a proxy that direct evidence can
lift); this skill carries the band into the
question and decides nothing from it. **A LOW band is evidence for the user, not permission to
exclude.**

Skip this step when nothing is blocked.

## Step 5. Summarize; apply the clear, ask per case for the rest

Print the summary in Japanese, grouped by disposition:

```text
依存脆弱性パッチ（窓 <N> 日 / pnpm-workspace.yaml の minimumReleaseAge 由来）

適用（同じ major の最小修正版・窓を通過・確認なし）:
  - <pkg> <installed> → <fixed>  [<importer>, 直接|推移的 (<parent> 経由)]  (<GHSA> / <severity>)

要確認:
  - major 越え     : <pkg> <installed> → <fixed>  [...]  (<GHSA>)
  - 上流範囲の外   : <pkg> <fixed> は <parent> の宣言 <range> の外  (<GHSA>)
  - 窓の内側       : <pkg> <fixed>  (公開 <date> / <clear-date> に解除)  トリアージ: <band>
  - 修正版なし     : <pkg>  (<GHSA> / <severity>)

未検出 / 要手動:
  - ...
```

The asymmetry is deliberate — patching is what the user invoked the skill for:

- **clear, same major, inside the parent's range → apply without asking.**
- Everything below is **asked with `AskUserQuestion`, one decision per entry**, options deselected by
  default. A precedent already in the file is not approval for the next entry.
  - **Major bump** — apply, or keep the current line and leave the advisory open.
  - **Out-of-range override** — apply with the justification the entry will carry, or wait for the
    parent to widen its range.
  - **Blocked** — wait until the clear date, or add a `minimumReleaseAgeExclude` entry for that exact
    version. Put the triage band in the option's description, and say what the entry costs: every
    checkout carries a policy exemption until someone deletes the line.
  - **No fix** — record a suppression in `osv-scanner.toml` / `.trivyignore.yaml` with a reason, or
    leave it open. [0004](../../../docs/adr/0004-library-management.md) requires an issue documenting
    the exposure and mitigation for a high that cannot be fixed at once; offer to draft it through
    `/new-issue`, which files only after its own confirmation.

If nothing is eligible and nothing was approved, skip to Step 8 with no writes.

## Step 6. Apply

Never hand-edit `pnpm-lock.yaml`; it is regenerated.

**Direct dependency.** Set the exact version in that importer's `package.json`, then:

```sh
pnpm install --lockfile-only
```

**Transitive dependency.** Add an entry to `overrides` in `pnpm-workspace.yaml`, in the form the
existing entries use — the selector names the **vulnerable range**, the value names the **fixed range
up to the next major**:

```yaml
  # <parent> (<who pulls it>) の推移的依存。<where it runs, when that matters>
  # <GHSA-id> (<severity>): <what the vulnerability does, one line>
  # <parent> の宣言は <declared range> で <fixed> はその内側。<parent> が <fixed> 以上を要求したら撤去する。
  "<pkg>@<vulnerable range>": ">=<fixed> <<next-major>"
```

- The selector's range is what makes the entry retire itself: once upstream moves past it, the entry
  matches nothing and cannot hold the package on an old version.
- **One entry per major line.** When the package resolves on several majors, bound each selector to
  its own major.
- **An existing entry for the same package and major is raised, not duplicated** — widen its selector,
  raise its floor, and add the new advisory to its comment.
- For an approved out-of-range override, the comment says so explicitly and names the check that
  exercises the untested combination instead.

Then `pnpm install --lockfile-only`.

`pnpm update <pkg>` reaches direct dependencies only, and `pnpm audit --fix` writes an override for
every fixable advisory at once without the comment this file requires — **use neither**.

**Approved exclusion.** Add the entry to `minimumReleaseAgeExclude` as the comment above that key
requires, which is also what `make suppression-expiry` reads:

```yaml
minimumReleaseAgeExclude:
  # <GHSA-id> の修正版。<where it runs>。
  # 窓が明ける <YYYY-MM-DD> に外す。
  - <pkg>@<version>
```

- **`<pkg>@<version>`, never a bare name** — a name-only exemption passes every future publish.
- **Block form, one item per line.** A flow-style item (`[...]`) has no line of its own, so the
  comment above it cannot be attached and the check rejects the entry.
- **The date is a JST calendar day**, the first whole day after the window opens (publish time +
  window): the weekly check compares calendar days, and deleting the line before the window opens
  breaks every install.

**Approved suppression.** Write the entry in the form the header of `osv-scanner.toml` /
`.trivyignore.yaml` and the suppression policy of [0110](../../../docs/adr/0110-security-operations.md) state — one
vulnerability id, a reason saying why it is acceptable here, and the condition that retires it.

## Step 7. Verify

The verdicts belong to CI; do not re-run its gates here
([`docs/playbook.md`](../../../docs/playbook.md), *ゲートを先回りして回さない*). Locally, only what
CI cannot tell you before the push:

```sh
pnpm install --frozen-lockfile --ignore-scripts   # the install CI runs; proves the lockfile replays under the policy
pnpm why <pkg> -r                                 # every resolution now at or above the fix floor
```

- A frozen install that fails with a release-age violation means an in-window version is uncovered —
  an exclusion is missing, not the window too long.
- A resolution still below the floor means the range landed on an older aged version; report it
  rather than tightening the range to force it.
- **After an exclusion or a suppression**, run `make suppression-expiry` once (through its quiet
  `ai-` form, per `AGENTS.md`). It is the only format check on those entries and runs weekly, not on a
  PR.
- **When the moved package is on the path of `make api-gen`**, run it and keep what it writes. The
  `gen-drift` workflow fails a PR whose generated files differ from what that target produces.

What CI then decides, on the PR, from the paths this skill touched: `dependency-scan.yaml` (Trivy fs
report, and `make audit`, which fails on a fixable high or critical), `osv-scan.yaml`, and
`dependency-review.yaml` (fails on a high or critical the PR adds). Report each as CI reported it.
A major bump's typecheck and tests are likewise CI's.

Do NOT roll back on a failure; report it and let the user decide.

## Step 8. Report

In Japanese:

- Packages moved, per importer, with the version diff, the mechanism (exact pin / parent bump /
  override) and every advisory id closed.
- Each new or raised override, with its removal condition — **an override is provisional**; once the
  parent requires the fixed version, it is deleted.
- Each exclusion added and **the date it must be deleted**, stated as a follow-up the user owns.
- Each suppression added, with its retiring condition.
- The triage band for every blocked entry, and any axis it could not answer.
- Declined, deferred, `no-fix`, `not-present` and `needs-manual` entries, and the advisories left open.
- The local results from Step 7, and which CI jobs will judge the change.

Do not stage, commit, or push. The user reviews the tree and runs `/commit`.

## Notes

- **Targeted, not blanket.** An unrelated outdated package is one line in the report, never a bump.
- **An exclusion is not a lowered window.** It exempts one `pkg@version`; lowering `minimumReleaseAge`
  exempts every dependency at once, silently. Never offer the second as a way to the first.
- **One workspace, one lockfile.** The exclusion and the overrides in `pnpm-workspace.yaml` govern
  every importer the workspace declares, so one entry covers all of them.
- **Idempotent.** A second run after a successful apply finds every named package at or above its
  floor and writes nothing.

## Checklist

- [ ] Advisories parsed and merged per package; the fix floor read from the advisory database
- [ ] Window, strict mode, exclusions and overrides read from `pnpm-workspace.yaml`; checked against ADR 0110
- [ ] Each package located with `pnpm why -r`; direct / transitive, parent and exposure recorded
- [ ] Lowest same-major fix chosen; major / out-of-range / no-fix / downgrade flagged
- [ ] Publish time read; every blocked entry triaged through `/supply-chain-triage`
- [ ] Clear same-major entries applied without asking; every other decision asked per entry
- [ ] Direct via exact pin, transitive via a range-selector override with its comment; lockfile regenerated, never edited
- [ ] Any exclusion is `pkg@version` with advisory, exposure and a JST date; window settings untouched
- [ ] Frozen install and `pnpm why` checked; `make suppression-expiry` after an exclusion or suppression; `make api-gen` when on its path
- [ ] Japanese report with follow-ups; nothing staged, committed or pushed

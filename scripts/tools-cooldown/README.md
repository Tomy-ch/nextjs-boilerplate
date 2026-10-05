# tools-cooldown

Checks whether the pins in `mise.toml` satisfy the supply-chain cooldown period. It is the gate that stops a pin
introduced by a hand edit, and a bump that does not go through the `tools-upgrade` skill is caught here too.

## What It Checks

It looks up the **publication time** of the version a pin points at from its distribution channel, and compares the days elapsed since then against that channel's window. The window
exists to buy time between a malicious version being published and upstream withdrawing it, so it is proportional not to what the tool
could break but to **which channel distributed it**.

| Distribution channel | backend | Source of the publication time | Variable that passes the window |
| --- | --- | --- | --- |
| GitHub Releases | `aqua:` / `ubi:` / `github:` | The Release's `published_at` (tries the tag both with and without the `v` prefix) | `TOOLS_COOLDOWN_RELEASE_DAYS` |
| Public registry | `npm:` / `pipx:` / `pypi:` | npm's `time`; for PyPI, the upload time of the distribution files (the earliest one) | `TOOLS_COOLDOWN_REGISTRY_DAYS` |

The window values are owned by [`.makefiles/security/tools-cooldown.mk`](../../.makefiles/security/tools-cooldown.mk),
and GitHub Releases reads the same variable as the Actions pins (the distribution channel is the same, so the detection lag is the same too).
**This script holds no default window** — it fails if any channel has no window. Passing 0 days switches off the quarantine
for that channel.

**A backend not in the table above fails as "could not be checked"** (exit 2). Being unable to look up the publication time
is not the same as being old. For the same reason, a pin whose version upstream does not know, whose response cannot be read, or whose query
failed also fails. Only the "outside the window" case below is exempt from this treatment.

## Outside the window — language runtimes (`core:`)

Pins on the `core:` backend (language runtimes such as node / python / go) **are not subject to the window. This is an accepted
risk.**

The window works against compromises of one shape: a malicious version is published as a single package, upstream detection catches up, and it is
withdrawn. A tainted language-runtime distribution does not have that shape. It is not the hijacking of
one link but **a failure of the language's trust model itself**: everything written in that language becomes
suspect at once, and waiting carries no guarantee that detection will catch up. The window is a delay against automated compromise and
does nothing against this shape. Failing on a window that does nothing only means every pin bump needs a pointless wait or an exemption.

Therefore a `core:` pin is:

- **never failed by the window**, in either `check` or `audit`
- **listed in the inventory** (in a form where the version and the fact that it is out of scope can be read). The exclusion is a decision, not a way of making
  it invisible
- **not reported as "could not be checked" (exit 2) either**. The exclusion is something "decided not to be checked", and it exits differently from a pin whose
  publication time could not be looked up. Collapsing the two into one exit erases the distinction between a check that did not hold and a check
  deliberately not run
- **not queried** for its publication time. Adding a query for a value the decision does not use only adds one more path
  that swallows that query's failure
- a violation if it carries an exemption (`tools-cooldown-ignore:`). That declaration has no effect

## Two Entry Points

| Command | Target | When |
| --- | --- | --- |
| `make tools-cooldown-check` | **Only pins that moved** since `TOOLS_COOLDOWN_BASE` | PRs. CI passes the base branch |
| `make tools-cooldown-audit` | Every pin | Weekly. Can also be run locally |

A PR looks only at the diff because the PR's author cannot fix on the spot a pin inherited from the base.
The inherited state is covered by the weekly inventory. What fails the inventory is a pin sitting inside the window without an exemption
— a pin merged while the gate was red is caught here.

## Exemptions

When you deliberately take a version inside the window, declare it in the comment block directly above the pin.

```toml
# 直前の版に脆弱性がある（GHSA-xxxx）。
# tools-cooldown-ignore: 修正版がこの版しか無い。窓が明ける 2026-09-21 に外す。
"aqua:owner/tool" = "1.2.3"
```

- From the `tools-cooldown-ignore:` line to the end of the block is the reason and the reversal condition. Lines above it are not read as the pin's description
- **The reversal condition includes the date the window closes, as `YYYY-MM-DD`.** An exemption is needed only while the pin is inside the window,
  and the day it closes is the day of withdrawal. An exemption with no date, or one that expires before the window closes, is a violation
- An exemption left on a pin that has satisfied the window is a violation. Its reversal condition has been met, so remove it
- An exemption also appears in the suppression inventory ([`suppression-expiry`](../suppression-expiry/)) under the name `<key>@<version>`,
  and fails weekly once past its deadline

This format carries the same three items as the other suppressions (target, reason, removal condition), and it lives in one place next to the
pin. Writing the reason in a comment follows the same shape as `overrides` /
`minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, because the pin declaration itself has no field to carry a reason.

## Exit Codes

| code | Meaning |
| --- | --- |
| 0 | Every pin subject to the window satisfies it (including exempted ones). Pins outside the window are not counted |
| 1 | Some pin is inside the window without an exemption, has an exemption that does not satisfy the format, or keeps an exemption it no longer needs |
| 2 | The check did not hold — a publication time could not be looked up / a backend has no channel / the base or `mise.toml` could not be read |

## Internal Structure

| File | Responsibility |
| --- | --- |
| `index.ts` | Receiving arguments and environment, `git show` and HTTP, exit codes |
| `published.ts` | Backend handling (distribution channel / outside the window / no channel) and how to read the publication time per channel |
| `rules.ts` | Selecting the diff, reading the window declarations, judging a single pin |
| [`../lib/mise-pins.ts`](../lib/mise-pins.ts) | Reading pins and exemptions from `mise.toml` (shared with the inventory) |
| [`../lib/withdrawal-date.ts`](../lib/withdrawal-date.ts) | The date in a reversal condition and calendar days (shared with the inventory) |

## Callers

- [`.makefiles/security/tools-cooldown.mk`](../../.makefiles/security/tools-cooldown.mk)
- [`.github/workflows/tools-cooldown.yaml`](../../.github/workflows/tools-cooldown.yaml) — `check` on PRs,
  `audit` weekly and on manual runs

## Related ADRs

- [0110](../../docs/adr/0110-security-operations.md) — a window per distribution channel, and the exclusion of language runtimes
- [0157](../../docs/adr/0157-inspection-declaration-discipline.md) — a check that did not hold is not collapsed into "no violations"
- [0159](../../docs/adr/0159-script-structure.md) — separating the entry point from the decision

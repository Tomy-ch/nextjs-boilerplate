# Instructions for GitHub Copilot

Defines how Copilot works in this repository.

## AGENTS.md is the single authority

**Conventions, architecture constraints, the scope you may change, Git operations, and the output language are all
held by [`AGENTS.md`](../AGENTS.md).** This file only points at it and holds no content of its own.

Holding no content is not a matter of form. **When the same rule is written in two places, only one of them goes stale.** And
the drifted side survives as "conventions only Copilot reads", becoming instructions that contradict an ADR head-on — such as permitting
the generic folders that [0027](../docs/adr/0027-directory-structure.md) forbids. In a form that only points,
this kind of drift structurally cannot occur.

Therefore **do not add conventions to this file.** Whatever you want to write goes in AGENTS.md or an ADR.

## Reading Order

Follow the order that `AGENTS.md` § Instruction Priority defines. This file is the third in it, and
when it disagrees with a higher source (`AGENTS.md` / `docs/adr/**`), the higher source wins.

These four places are enough to read.

| What you want to know | Where to read |
| --- | --- |
| Layer responsibilities, dependency direction, where kernels live | The relevant ADR from the ADR index in [`docs/adr/README.md`](../docs/adr/README.md) |
| Paths you may change | `AGENTS.md` § AI Modification Scope |
| Branch, commit, and PR practice | `AGENTS.md` § Git Rules and [0150](../docs/adr/0150-git-workflow.md) |
| Implementation rules followed day to day | [`docs/rules.md`](../docs/rules.md) |

## Copilot-Specific Operations

Holds the circumstances specific to this tool that AGENTS.md does not cover.

- **The actual branch protection is held by [`settings/branch-protection.json`](settings/branch-protection.json).**
  Copilot does not commit directly to a protected branch and always cuts a feature branch. It does not merge without waiting for approval
- **Stop after stacking commits on a PR branch.** Whether to push is decided by a human (`AGENTS.md` § Git Rules)
- **Write code review comments in Japanese as well** (`AGENTS.md` § Language Rules)

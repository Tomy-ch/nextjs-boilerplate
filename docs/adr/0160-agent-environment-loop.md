# Improving the Agent Environment as a Loop

This project treats the environment AI agents use — skills, agent definitions, rule documents, gates — **not as something only added to but as something improved in a loop**. One cycle runs from observing what is actually not working, to fixing it, to **re-measuring what was fixed**.

The unit of observation is owned by [0161](0161-development-window-as-feedback-unit.md). What this ADR owns is **the decision to run the loop itself** and **where its state lives**. What each skill does is owned by [0154](0154-claude-skills-operations.md) / [0155](0155-claude-skills-development.md).

## Status

Accepted

## Rationale / Purpose

- **Left alone, the agent environment only grows.** Skills and rules increase by the number of times a stumble is noticed, and there is structurally no occasion for them to decrease. What was added becomes a premise for the next reader, so things that do not work pile up mixed in
- **"Not used" is not grounds for deletion.** Many of this repository's skills **wait for an occasion**, and a week in which the occasion did not come says nothing. Judging by invocation count alone would retire the whole scaffolding set in a month when no new screen was built
- **Without re-measuring what was fixed, the loop degenerates into an accumulator.** Unless it is checked whether an improvement worked, improvements that did not work also stay in the environment. **Re-measurement is the only stage that separates this loop from "only adding"**

## Decision 1: Observe → improve → re-measure is one cycle

```text
window opens → work → window closes → findings are produced → a human decides what to take in
        → the improvement lands → re-measure after a set period → check whether the same finding returned
```

- **Producing findings is the machine's job; what to take in is decided by a person.** Changing the environment touches the agent's own configuration, so Agent configuration file protection in [`AGENTS.md`](../../AGENTS.md) applies as is
- **Re-measurement cannot be skipped.** The moment it is skipped, this decision is void and the environment goes back to only growing
- **Landing is not recorded twice.** That an improvement landed is expressed by **the feedback record being closed**. Keeping a separate "landed on" field by hand means **the copy nobody rereads is the one that rots**

## Decision 2: Deterministic tallies first, the model after

**Most of what this loop reports needs no model.** Skill invocation counts, tool failures, interruptions, durations, stage intervals, the gap between review and merge — all are **things to count**, not things to interpret.

A model is needed for only two things — **saying "what was hard" about a single window**, and **folding read windows into concerns**. For both, the input is limited to what the deterministic tallies **have already narrowed**. **The narrowing makes the cost of reading viable, and the reading makes the narrowing worth doing.**

The second is **one step weaker as evidence**. Its input is already model output (the reading section), so errors can be amplified. So folding is bound by three constraints.

- **Ranking and re-measurement do not depend on folding.** The grouping key is the classification label, and no classification by meaning is done. Even if folding fails, the weekly run holds
- **What is folded into always carries the list of grounds.** Since it is one level more abstract than the source, being unable to trace which observation it came from makes it **a claim that cannot be verified**
- **Folding runs only when explicitly requested.** If the side effect of opening issues and closing the sources were in the default, no one would notice when an unintended fold happened

- **A finding records which half produced it.** What was counted and what was read are not evidence of the same strength, and **a mixed report cannot be rebutted**
- **The reading side runs on the machine that created the records.** Records live on the developer's machine, and carrying them elsewhere creates **a path that takes their content outside** ([0110](0110-security-operations.md) / [`docs/design/security.md`](../design/security.md))
- **Being unable to read is not collapsed into "no findings".** A person skipped it, the model could not be called, there was no material — what happens next differs for each, so they are reported distinctly ([0157](0157-inspection-declaration-discipline.md))

## Decision 3: Skills are judged against their usage type

**A skill that was not called is not, by that alone, useless.** Each skill declares its own **usage type**, and judgment is made against that type.

| Type | Meaning | What the invocation count says |
| --- | --- | --- |
| `frequent` | Called day to day | Not being called is a finding |
| `situational` | Only when an occasion comes | Nothing can be said without looking at whether the occasion came |
| `lifecycle` | Once per version or milestone | 0 is normal if no milestone fell in the period |
| `automatic` | Started by a hook or CI | A person's invocation count is not a metric |
| `safety` | **Being rare is normal** | The invocation count is not a metric. Being called is the finding |

**The declaration is held by the skill itself.** Placing it in a separate ledger file means only the ledger goes stale on the day skills are added. Machine enforcement is held by the enum check of `skill-lint` ([0144](0144-decision-enforcement-pairing.md)).

**There is no general way to observe "occasions where it could have been used".** Occasions are written only for targets where they can be written; for those that cannot, **declare that they cannot and judge by other grounds** — outputting a predicate without an evaluator as a number makes **a broken inspection return green** ([0157](0157-inspection-declaration-discipline.md)).

## Decision 4: State is split across three places

| What | Where | Why there |
| --- | --- | --- |
| **Declarations** — usage types, the list of machine posters | Tracked (skill frontmatter / declarations in `.agents/`) | Reviewed like other declarations |
| **Machine-local index** — a regenerable cache | `.agents/private/` (in `.gitignore`) | **Losing it costs nothing**. Committed, it would claim to be the truth on another machine |
| **Per-window timestamps and temporary records** | `tmp/` (in `.gitignore`) | Per run, per checkout. Not worth keeping |
| **The findings themselves** | **The issue tracker** | Can be fixed and removed without a git operation. **Not placed inside the repository** |

**The source of truth for findings is not placed in the repository.** A place that needs commits to maintain is a place that stops being maintained, and this loop **constantly corrects and retires findings**.

**The destination is not held as a setting; it is derived from the `.git` remote.** The very place this repository pushes to is
the issue tracker the table above refers to. Holding the destination in a separate setting would create **a form that can send to a destination unrelated to the repository**,
and the debate over boundaries would move to that setting's value. Nothing is sent to hosts other than GitHub — a destination being
in `.git` does not mean it is GitHub.

Only windows that are **closed and have crossed at least one stage boundary** are sent. A window still open is incomplete, and a half window
is worse than a late one. A window that was merely opened and closed is a window in which nothing happened, not a finding, and `/clear` alone
creates a window, so letting those through would **open an empty issue for every launch**.

## Decision 5: Reading records is limited to this repository's share

The weakness of timestamps is **coverage** — what is not stamped does not exist. What compensates is the session
records Claude Code writes, **whose location the tool decides, and which lie outside the repository**
(`~/.claude/projects/<working-tree path>/`). **No one placed them there; the tool writes them there.**

**The mechanism is placed inside the repository, and only read-only data lies outside.** This shape is already ordinary in this
repository — `scripts/base-branch` reads the live state of `origin`, `tools-upgrade` reads
upstream registries, and the toolchain lives in `mise`'s location. The target of reading lying outside and
the mechanism lying outside are different things.

Reading is subject to three boundaries.

- **The scope is only this repository's share.** The tool lines up one person's records for every project under the same parent, and the location is
  derived from the directory where the session was opened, so **it does not go beyond the locations derived from this repository's working
  trees**. What counts as a working tree is decided by git, and directories with similar names are not picked up —
  deciding the scope by prefix match would make the boundary a guess
- **Reading happens only on the machine that created the records.** Carrying them creates **a path that takes content a person pasted into a session outside**
  ([0110](0110-security-operations.md)). CI does not read the records
- **What leaves is the result of reading, not the records themselves.** Excerpts are not copied into public places. **This is guaranteed by a check, not an instruction** — even when verbatim quotation is forbidden, the model lines up utterances as grounds (measured). The candidates handed over are known, so whether they appear in the body can be judged by machine, and sections that match are dropped, with **the fact of dropping written in the body** ([0157](0157-inspection-declaration-discipline.md))

**These three boundaries do not depend on who owns the repository.** The scope is derived from the working tree, reading happens only on the machine
that created the records, and what leaves is counted facts. So **this mechanism is passed on to copies too** —
what changes is who reads the findings, not the boundaries themselves.

## Rejected Alternatives

| Option | Reason not adopted |
| --- | --- |
| Judging by invocation count alone | Treats an occasion not coming and an occasion coming but going unused as the same 0. **The whole scaffolding set retires in the first month** |
| Holding findings in a ledger in the repository | Every correction and retirement needs a commit. **It stops being maintained, and old findings remain as authority** |
| Carrying records to CI to read | Records live locally. Carrying them creates **a path that takes content a person pasted outside** |
| Recording the landing date separately | A second record of the same declaration, and the side kept by hand rots |

## Prohibitions

- ❌ **Skipping re-measurement.** The moment it is skipped, this decision is void (Enforcement: the weekly run of `.github/workflows/closed-loop-weekly.yaml` runs the re-measurement)
- ❌ **Retiring a skill on invocation count alone.** Do not judge by numbers without looking at type and occasion
- ❌ **Producing numbers from a predicate without an evaluator.** Report unevaluated as unevaluated ([0157](0157-inspection-declaration-discipline.md)) (Enforcement: Prose — **not mechanizable**. Whether a predicate has an evaluator is decided by the predicate's meaning)
- ❌ **Placing the source of truth for findings inside the repository.** (Enforcement: none — a decision not to adopt. Not having a ledger of findings in the repository is itself the state, and a change placing one shows up in the diff as an added tracked file)
- ❌ **Performing outward actions without human confirmation.** Opening issues and posting both follow the confirmation requirements of [0154](0154-claude-skills-operations.md)
  - **The only exception is the closed-loop send.** The agent does not choose the destination (the `.git`
    remote decides it), what leaves is only facts counted from timestamps with no excerpts of records (Decision 5),
    and the windows sent are limited to closed ones — with all three in place, the judgment that confirmation protects is not present here.
    **If any of the three breaks, the exception is removed too.**
  - The exception is limited to the send path itself. The same mechanism sending to another destination, carrying excerpts of records, sending
    a window still open — each is a new outward action and goes back to the confirmation requirement
- ❌ **This mechanism automatically rewriting the agent's own configuration.** What to take in is decided by a person ([`AGENTS.md`](../../AGENTS.md)) (Enforcement: Prose — **partly mechanizable**. Whether `scripts/closed-loop/**` and `.agents/closed-loop/**` spell `.claude/` or `AGENTS.md` as a write destination can be rejected by a scan, but no rule exists. A path written through an assembled path is decided by run-time values)

## Notes

**This mechanism is passed on to copies too.** What the copying side receives is the set of skills and rules, and since it did not write them itself, the opening point "left alone, it only grows" applies even more strongly than upstream. It is not registered for stripping — neither the destination nor the location is given from outside (Decision 4 / Decision 5), so it holds as is where it lands.

## Related ADRs

- [0161-development-window-as-feedback-unit.md](0161-development-window-as-feedback-unit.md) — the unit of observation
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) / [0155-claude-skills-development.md](0155-claude-skills-development.md) — skill conventions, and where usage types are declared
- [0157-inspection-declaration-discipline.md](0157-inspection-declaration-discipline.md) — how inspections that do not hold fall
- [0144-decision-enforcement-pairing.md](0144-decision-enforcement-pairing.md) — pairing declarations with machine enforcement
- [0110-security-operations.md](0110-security-operations.md) — handling paths that take records outside

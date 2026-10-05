# The Development Window as the Unit of Feedback

Defines **the unit of observation** for the loop run by [0160](0160-agent-environment-loop.md). This ADR decides "what one cycle is a cycle about", and holds nothing else.

The unit is **the development window** (window) — **one continuous stretch of work with an agent**, counted as one item from when it opens until it closes.

## Status

Accepted

## Rationale / Purpose

- **Without a decided unit, findings cannot be counted.** Both "the skill was not called" and "it got stuck here" become findings only once you can say **how many times out of how many**. The definition of the denominator is that unit
- **Every handy candidate is broken as a denominator.** Sessions, commits and PRs all break at points that do not coincide with breaks in the work (below)
- **The unit must be decidable by a machine.** A form where a person reports "this is one item" drops unreported work from observation entirely

## Decision: A window is bounded by "open" and "close"

| | Marked by | Why |
| --- | --- | --- |
| **Open** | The point at which work with an agent begins | Subsequent timestamps and records belong to this window |
| **Close** | The point at which the context of the work breaks — explicit discarding of context, compaction of context, the end of the work | **Where the context breaks coincides best with where a person's work breaks** |

**Closing is the trigger for producing findings.** An open window is still in progress, and producing findings from an in-progress window **counts the same work several times**.

**Windows are independent per checkout and per run.** Windows opened in parallel on the same host are separate windows and are not mixed — this repository operates by opening worktrees in parallel, so mixing them would make one person's work look like several people's.

## Why not sessions, commits or PRs

| Candidate | Why it breaks as a denominator |
| --- | --- |
| **Session** | It breaks for the tool's reasons. The connection dropped, the window was closed, it was resumed — **none of these are breaks in the work.** One piece of work splits into 3 sessions, and findings are counted 3 times |
| **Commit** | It is the unit of the work's **output**, not of the work. **Work that got stuck and could commit nothing vanishes from the denominator** — and that is the work with the most findings |
| **PR** | Too coarse, and **work that produced none is dropped**. Windows that ended at investigation, or that were thrown away after changing direction, have no PR |
| **Self-report** | Unreported work drops out of observation entirely. And **the busier the day, the less is reported** |

**What they share is that "what drops is biased".** If what spills from the denominator were random it could still be estimated, but every one of the above **preferentially drops the work with the most findings**.

## Decision: Timestamps first, records as a complement

What happened inside a window is taken from **two layers**.

- **Timestamps (marks) carry meaning.** At the moment a stage boundary is crossed, the side that crossed it stamps it. **That boundary exists nowhere else** — records keep every exchange but do not know which stage an exchange belonged to. Their weakness is **coverage**: **what is not stamped does not exist**
- **Records (transcript) carry coverage.** Every exchange, duration, failure and interruption remains whether or not anyone meant to keep it. Their weakness is **meaning**: they cannot say **what an exchange was for**

**Timestamps come first, records complement them.** Where there is no timestamp, it is derived from the records and **marked as derived** — a reconstructed value is worth having, and **knowing that it was reconstructed is also worth something**.

## Prohibitions

- ❌ **Producing findings from a window still open.** The same work is counted several times (Enforcement: `scripts/closed-loop/sent-index.test.ts` (excludes windows still open from what is sent))
- ❌ **Mixing parallel windows.** One person's work looks like several people's (Enforcement: `scripts/closed-loop/marks-store.test.ts` pins that windows are assembled separately per working tree. Assigning a window id per run lives in `.agents/closed-loop/marks.sh` and is Prose — **not mechanizable**. It is shell whose requirement is to answer immediately from a hook, and cannot be cut out into a judgment module)
- ❌ **Making self-reports the unit.** The busier the day, the more drops (Enforcement: none — a decision not to adopt. Having no endpoint that receives self-reports is itself the state, and a change adding one shows up in the diff as an added mechanism)
- ❌ **Reporting values derived from records as if they were stamped values.** Leave a mark that they were derived ([0157](0157-inspection-declaration-discipline.md)) (Enforcement: Prose — **mechanizable** (giving stamped values and values derived from records different types, and requiring a derivation mark in the observation section, would reject it by type. No rule exists))
- ❌ **Placing window records under the repository's tracking.** Where they live is owned by [0160](0160-agent-environment-loop.md), which splits state across three places (Enforcement: Prose — **mechanizable** (check in a gate test that `git ls-files tmp/closed-loop .agents/private` is empty. No rule exists))

## Related ADRs

- [0160-agent-environment-loop.md](0160-agent-environment-loop.md) — the loop that uses this unit
- [0157-inspection-declaration-discipline.md](0157-inspection-declaration-discipline.md) — not mixing derived values with observed values
- [0151-git-hooks.md](0151-git-hooks.md) — one of the points that stamp timestamps

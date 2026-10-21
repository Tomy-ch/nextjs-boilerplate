# Glossary

Collects, among the terms used in specification prose, **the screen-side concepts that are not in the contract**.

## What This Table Holds and Does Not Hold

**It holds only "terms needed to write screens that do not appear in the backend contract".** When the same term is used with different
meanings on different screens, the specifications read fine but the implementations disagree — and that happens only with terms the contract
does not decide.

**It does not hold business vocabulary.** Its source of truth is the contract and the types generated from it
([0070](../adr/0070-backend-role-separation.md) / [0072](../adr/0072-api-type-generation.md)).
Holding it separately would duplicate it, and when the contract changed only the table side would silently go stale.

**Most definitions are not here either.** What the table below holds is "which document decides that term";
the substance of the meaning is held by that document. What is defined here is **only terms that had no home anywhere**
(the handling of inventory in [`docs/README.md`](../README.md) — an inventory carries no basis and only points).

## Screen Skeleton

| Term | What it refers to | Document holding the definition |
| --- | --- | --- |
| **layout shell** | The unit made by a route group and a layout that wraps everything beneath it. Render timing and the unmount boundary are decided here | [0026](../adr/0026-layout-shell-mount.md) |
| **outer frame** | The common frame the user sees. **Keep the outer frame the same even when the layout shells are split** — splitting layout shells is a matter of render timing, and is no reason for it not to look like a continuation of the same site | [`docs/rules.md`](../rules.md#layout) |
| **band** | A tier of viewport width. Decides what is placed where, and whether it is shown. Not used for branching a component's content (that is container queries) | [`docs/rules.md`](../rules.md#layout) / [0051](../adr/0051-styling-system.md) |
| **sidebar** | A secondary region that can be permanent only when the band is wide. On bands without it, controls that must always be reachable are fixed to the bottom of the screen | [`docs/rules.md`](../rules.md#layout) |
| **breadcrumbs** | The navigation that shows the path to the current location. **Not something the layout shell places uniformly; held by screens that meet the conditions** | [0026](../adr/0026-layout-shell-mount.md) — which screens place breadcrumbs |

## Rendering

Rendering terms (Server Component / Client Component / SSR / hydration / RSC Payload / island) are
**owned by [`docs/design/rendering.md` § Terminology](../design/rendering.md#terminology)**. It also says what goes wrong when they
are confused, so they are not copied here.

The one that comes up particularly in specifications is the following.

| Term | What it refers to | Document holding the definition |
| --- | --- | --- |
| **island** (Client Island) | A small Client Component embedded for interaction in a screen rendered mostly on the server. A nickname, not an official term | [`design/rendering.md` § Terminology](../design/rendering.md#terminology) |

## States

| Term | What it refers to | Document holding the definition |
| --- | --- | --- |
| **the four states** | loading / empty / error / success. **Each screen designs them, and implements and tests only the states that screen owns** | [`docs/rules.md`](../rules.md#states) |
| **loading UI** | How loading is shown. A skeleton of similar shape is preferred, and it is **not made a target for screen readers**. Its item count is not matched to the real data | [`docs/rules.md`](../rules.md#states) |

## Terms Defined Here

Terms that had no home anywhere. **This is not coining new terms; it gives a home to terms specification prose already uses.**

### Empty State

**"There is nothing yet" and "the filtered result is empty" are different empties.** Showing them with the same text means the screen does not convey
that removing the conditions would make things appear. A specification states which empty it refers to.

"Could not be read" is not empty. It is an error, and mixing them delivers a retryable failure to the user as "there is nothing"
([`docs/rules.md`](../rules.md#states)).

### Caveats

**A short note that is not the screen's content itself, but changes how the content is read.** As of when the displayed values are,
how far they extend, whether they are provisional — without it, users read the display at face value.

**Where it is placed is a promise of the screen, not a matter of the component's convenience.** So the specification states the position, and the implementation follows it
([0143](../adr/0143-spec-driven-development.md)). If it falls after the content in reading order, the content is read to the end before
the note is.

## Adding a Term

**Choosing the canonical name and declaring synonyms are human judgments.** This table reports when it finds "one term pointing at two things"
or "two terms pointing at the same thing", but does not decide which is right.

Before adding, check whether the term falls under any of the following. If it does, its home is there, and it is not written here.

- Business terms → the contract and generated types ([0070](../adr/0070-backend-role-separation.md) / [0072](../adr/0072-api-type-generation.md))
- Names of layers, kernels and app-layer elements → `architecture.ts` and [0021](../adr/0021-frontend-responsibility.md) / [0027](../adr/0027-directory-structure.md) / [0028](../adr/0028-naming-convention.md)
- Rendering terms → [`design/rendering.md` § Terminology](../design/rendering.md#terminology)
- Terms for constraints enforced day to day → [`rules.md`](../rules.md)

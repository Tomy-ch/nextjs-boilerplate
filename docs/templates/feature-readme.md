---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability]
forbidden: [features]
test-requirement: [feature, component, unit]
---

# <feature name>

<!--
src/features/<feature-name>/README.md is a copy of docs/templates/feature-readme.md.
`pnpm gen feature` places it, or copy it by hand and fill it in.

Decide where things belong before writing. This README holds only the role specific to this slice and
an index into the contracts, specifications and designs. The following three do not go here.

- The layer's own role, acceptance criteria and import boundaries → src/features/README.md
- What a screen promises (conditions, transitions, failure semantics) → docs/spec/route/**
- How a state looks → the Storybook story

Write the same thing in two places and only one of them rots. A rotted index still surfaces as a broken
link; a copy silently diverges. **For a screen with a nested README (e.g. `<route>/<child>/`), the child
holds that screen's contracts, states and Actions, and the parent holds only the route map and an index
to its children.**
-->

<!-- Required sections. readme-review's scoring reads this list. Match the heading text exactly.
required-sections:
  - What Belongs Here
  - What Does Not Belong Here
  - Routes and Contracts
  - States and Design References
  - Structure
  - Kernel Dependencies
  - Action Return Contract
  - Test Perspectives
  - Related ADRs
-->

<!-- State in one or two sentences the screens and the scope this slice takes on. -->

## What Belongs Here

<!-- What this slice holds. Draw this slice's line, not a restatement of the layer's acceptance criteria. -->

## What Does Not Belong Here

<!-- What is handed to neighbours. Name where it goes (`components` / `model` / another feature's facade). -->

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `<e.g. /items>` | `<link to the screen / function under docs/spec/route/…>` | `<not required / required / role: admin>` |

The operationIds used.

| operationId | Purpose |
| --- | --- |
| `<e.g. GetItems>` | `<e.g. fetching the list>` |

A slice that uses no API places no table and writes "not used" with the reason. If an operationId is not
settled yet, write what will settle it.

## States and Design References

<!--
The story owns how a state looks. This section holds only which story corresponds to which state.
Write a story identifier as `<title>/<export name>` (title is the `title:` in stories.tsx).
-->

| Screen | State | story |
| --- | --- | --- |
| `<e.g. list>` | success | `<e.g. Page/Items/List/Default>` |
| | empty | `<e.g. Page/Items/List/Empty>` |
| | loading | `<e.g. Features/Items/Skeleton/Default>` |
| | error | `<e.g. Features/Items/ErrorState/Default>` |

Where a partial failure is possible, also list as a row the story for the display that keeps the
successful region.

## Structure

| File | Role |
| --- | --- |
| `<e.g. list/page-content.tsx>` | `<e.g. interpreting the fetch conditions and assembling the screen>` |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `<e.g. adapters>` | `<e.g. fetch the list and convert it to the display model>` |

Follow the import boundaries in `architecture.ts` and each kernel's README. Do not pass generated API
types to features / components.

## Action Return Contract

<!-- If there is no Server Action, write "none". It does not necessarily live directly under the feature. -->

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `<e.g. addItemAction>` | `<e.g. actions.ts>` | `<e.g. ActionState<void>>` | `<e.g. revalidatePath("/items")>` | `<e.g. field error>` |

## Test Perspectives

<!--
Do not restate the layer's declaration (`test-requirement: [feature, component, unit]`) or ADR 0090's
per-layer responsibilities. Write here only the perspectives that arise in this slice alone.
-->

- [ ] `<e.g. the conditions go into the URL, and going back restores the previous conditions>`

## Operations

<!--
Not required — **so that the heading's name is not fixed**. What goes here is this slice's design
judgment, and its name changes with what is written (`Operations` / `Design` / `Design Decisions` /
`Usage` / `What Sits Alongside`). Fix one name and content that does not fit it escapes into another
section.

Write why the line was drawn there, not what is being done.
-->

<!--
Add a "What to change on the side created from the template" section only when needed. It is the
section that states what the side created from the template replaces (backend contract, design,
authentication). **A slice discarded whole does not need it — no side remains to do the replacing.**
Place it only in a slice that survives, when there is a point the creating side cannot avoid touching.
-->

## Related ADRs

<!--
**This section is the only place that receives ADR references from this slice.** Place it last (it
is an index, so it comes last in reading order).

- **Do not reference an ADR from a code comment** (`docs/rules.md#comments`).
  An ADR's number, sections and the location of a decision all move, while the README moves with the
  slice, so rotting references do not spread into the code. If a comment needs a source, write it in a
  form traceable from nearby, such as "placement is in the same feature's README"
- **Do not scatter them through the prose.** Unless they are gathered in this section, neither readers
  nor machines can tell that this is where ADR references are received. Link an ADR listed here again in the body
  only when that sentence's claim depends on what the ADR says (e.g. "the path §2 admits as a limited
  exception")
- **List only the ADRs actually depended on.** Do not build an exhaustive list — a table that lists
  everything does not show which ones take effect, and is as good as none
- **On one line, write "number + what that ADR holds".** A bare list of numbers does not tell the reader
  which to open. If you want to state how it takes effect in this slice, that belongs to the design
  judgment section
- Confirm that relative paths resolve (`../../../docs/adr/` from a README directly under the slice, one
  level deeper when nested)
-->

```markdown
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical placement and co-location
- [0070](../../../docs/adr/0070-backend-role-separation.md) — The line of responsibility with the backend
```

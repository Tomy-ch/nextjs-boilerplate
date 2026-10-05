---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # Exception: whole-screen stories
test-requirement: [feature, component, unit]
---

# site-info

The screen slice that describes this site itself.

## What Belongs Here

- Describing the site's purpose, its composition, and what does not work
- Describing where entered information is stored
- The conditions of consent to browsing, and the disclaimer
- The route declarations of these three screens

## What Does Not Belong Here

- Fetching. No screen's content varies by viewer
- Direct dependencies on other features

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/about` | [`screen`](../../../docs/spec/route/site-info/about/page.screen.md) / [`function`](../../../docs/spec/route/site-info/about/page.function.md) | Not required |
| `/privacy` | [`screen`](../../../docs/spec/route/site-info/privacy/page.screen.md) / [`function`](../../../docs/spec/route/site-info/privacy/page.function.md) | Not required |
| `/terms` | [`screen`](../../../docs/spec/route/site-info/terms/page.screen.md) / [`function`](../../../docs/spec/route/site-info/terms/page.function.md) | Not required |

**No operationId is used.** This is because the slice does no fetching, and it does not change as the contract grows.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| The three screens | success | No whole-screen story is placed (see below) |
| Footer links | default | `Features/SiteInfo/RepositoryLinks/Default` |
| | supplement opened | `Features/SiteInfo/RepositoryLinks/WithHoverCard` |

**A screen without fetching has only one state, so no screen story is placed.** One would be
a single `Default`, and each added story only lengthens the VRT run time. The look of the three screens is
covered by the E2E screen comparison (`e2e/lib/screens.ts` has `about` / `privacy` / `terms`).

## Structure

| File | Role |
| --- | --- |
| `facade/paths/` | Two routes. Exposed through the facade because the links on My Page (another feature) reference them |
| `repositories.ts` | The repositories this site is built from. The links and the cards read the same table |
| `about/view.tsx` | What the site is for, what it is made of, and what does not work |
| `privacy/view.tsx` | Explains where entered information remains, for each way of starting the site |
| `terms/view.tsx` | Consent to browsing, security risks, terms of service provision, and the disclaimer |
| `ui/site-footer/` | The footer rendered by the user-facing layout shells. There are two layout shells, so this is the single owner of its contents |
| `ui/repository-links/` | Links to the two repositories placed in the footer. The description goes in a HoverCard as a supplement |
| `ui/repository-cards/` | The descriptions of the two repositories placed on 「このサイトについて」 ("About this site") |
| `ui/repository-supplement/` | A collapsed surface with each repository's purpose and capabilities |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `components` | The containers that lay out text (headings, cards, collapsible surfaces, HoverCard) |
| `observability` | Puts rendering on spans |

It does no fetching, so it does not use `adapters`. It does not hold `model` either — all it displays is the text it owns,
and there is no display model shared across features.

## Action Return Contract

None. These three screens have no operations.

## Test Perspectives

- [ ] The disclaimer appears only on the terms of use (it does not appear on 「このサイトについて」)
- [ ] The footer links carry text that makes the destination clear even when the supplement cannot be read

## Operations

- **Both are rendered statically.** They do no fetching, and their content changes only when the code is rewritten
- **They are not protected.** Neither the disclaimer nor the storage location means anything unless it can be read before logging in and before
  entering anything
- **The privacy explanation does not take the generic form.** Where entered information remains changes in three ways depending on how this
  boilerplate is started (connected to your own Go side / still on mocks / the public sample).
  With stock wording, users could not tell which case applies to them
- **The warning asking for a pseudonym is placed first.** Writing it after the three explanations means it is read after the user
  has already entered information
- **Its role is kept separate from the top page's caveat.** That one (`SampleNotice` in `features/home`) carries only
  "not to be mistaken for real transactions" and the link to the terms of use and stays short; the detailed explanation
  is held here
- **Design-level names do not appear in user-facing text.** How layers are divided or where responsibilities lie gives users
  who came to try this site nothing to decide with. Those who want to read about it go to the repository, so the footer links
  suffice
- **Only the terms of use hold the disclaimer.** Placing it in two places, together with 「このサイトについて」, makes it possible to fix
  only one of them
- **Repository descriptions are placed only in the HoverCard.** Showing them at all times would give the footer as much text as
  the body. The button text alone makes clear what is behind it, so the link works as a link even when the
  supplement cannot be read

## Related ADRs

- [0021](../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. What is lent to other features is exposed in `facade/`
- [0040](../../../docs/adr/0040-routing-rendering-strategy.md) — Rendering strategy. A surface with no fetching is served statically
- [0053](../../../docs/adr/0053-ui-component-interaction-seam.md) — The a11y seam of interaction. The conditions under which a link works even when the supplement cannot be read

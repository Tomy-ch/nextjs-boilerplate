# Root Outer Frame (Screen Requirements)

> Functional requirements: [`layout.function.md`](layout.function.md).

The outermost layout shell wrapping every screen. It renders only the panel that asks for consent and the region for notifications that
appear across screens, and has neither header nor footer — those are placed by each route group's layout shell. The notification region
shows nothing while there are none, but stays on screen as a named region.

## The Consent Panel

It sticks to the bottom of the screen at full width and covers the background with a translucent overlay.

| Region | Content |
| --- | --- |
| Heading | What is being asked about |
| Description | Text from which the distinction between what is needed and what is optional can be read |
| Link | To a document giving the material for the decision (a configuration without it can also be chosen) |
| Actions | Two: 「同意する」 (agree) and 「必要なものだけ使う」 (use only what is needed) |

**The two actions are laid out at the same size.** Refusal alone is not made smaller or given an inconspicuous look. Making it harder to
choose means the consent obtained is no longer freely given.

The only way out of the panel is choosing one of the two actions; there is no close action either (the reason is
[`layout.function.md`](layout.function.md), "Keep asking until a choice is made").

**On narrow screens, the description and the actions are stacked vertically.** Side by side, the description gets squeezed to an
unreadable width.

**This layout shell does not hold the wording.** Which cookies are used for what depends on the products connected, and how much to write
depends on the jurisdiction, so the place to rewrite it is gathered into one (the component that renders the consent panel holds the
wording's definition. [Related](#related)).

## When the Panel Appears

**It does not appear immediately after load.** It appears after the browser side finishes reading the consent state (the reason is in
[`layout.function.md`](layout.function.md)).

## Related

- Implementation: `src/app/layout.tsx` / `src/app/consent.tsx`
- The [README](../../../src/components/shell/consent-banner/README.md) of the component that renders the consent panel, and its Storybook

# ConsentBanner

## Purpose

A surface that keeps asking whether cookies may be used for optional purposes until the user has made a choice. It sticks to the bottom edge of the screen and covers the background.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ConsentBanner` | Renders the asking surface and returns the chosen intent to the caller through `onDecide`. It holds neither state nor storage. |

`CONSENT_BANNER_COPY` in `consent-banner.definition.ts` owns the text. [`model/consent.ts`](../../../model/consent.ts) owns the consent state type, the decision, and the cookie spelling.

## Use Cases

Place it once in the layout shell. It goes in the root layout; the supplying side ([0031](../../../../docs/adr/0031-policy-state-supply.md)) owns the decision of whether to ask and the storage of the chosen intent.

**This component does not read the consent state.** It only renders `open` as passed, so it behaves the same in Storybook and on the screen of a user who has not chosen yet.

## Design

- **It provides no way to close.** It accepts neither Escape, nor pressing outside the surface, nor an × at the top right. If it could be closed without choosing, an "asked but not chosen" state would remain and it would appear again on the next render. The only closing action is choosing
- **It does not let the background be operated.** Until the choice is made, focus cycles within the surface, and the background also becomes unreadable to assistive technology. Trapping only focus while leaving the visual background open would make the operable range differ between sighted users and screen-reader users
- **The two choices are laid out at the same size.** Making only the refusal smaller or less noticeable would mean the consent obtained was not freely given
- **It does not move history.** `Dialog` pushes history so it can be closed with the back action, but this surface was not opened by the user, so it is not a target of the back action
- **It is a client island.** It needs hydration to trap focus and make the background inert in the browser

## Choosing Between Neighboring Components

`Dialog` is a surface the user opens by pressing a trigger, with a way to close it and the back action. This component has neither.

## Verification Scope

- Storybook `Overlay/ConsentBanner` — the default with links attached, and the case with no document to point to
- Tests — that the choice is passed to `onDecide`, that the closing means do not work, and that the surface is not in the DOM when `open` is false

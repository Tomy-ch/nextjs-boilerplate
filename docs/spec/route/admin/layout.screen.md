# `/admin` Outer Frame (Screen Requirements)

> Functional requirements: [`layout.function.md`](layout.function.md).

The admin outer frame. It is a **separate layout shell** from the customer-facing outer frame, and places navigation at the side rather than across the top.

## Why not a single frame

The audience differs, and so do the number and depth of the links. Merging them into one means the layout shell carries a branch
that swaps links by audience ([0026](../../../adr/0026-layout-shell-mount.md)). Admin operations grow per target (products,
users, aggregates), and they grow vertically, so they do not fit in a horizontal header.

## What It Shows

| Region | Content |
| --- | --- |
| Sidebar list | The admin side's name, and links grouped by target |
| header | Opening and closing the sidebar list, the site name, and the link back to the customer-facing screens |
| Path to the current location | The top of the main content. Each screen passes its content |
| Main content | Each screen's content. Its width is not constrained |

**Three names point to different places.** "管理" at the top of the sidebar is the admin home, the site name in the header is the
site's top page, and "ユーザー画面へ" is the customer-facing main screen. The same bar does not hold two links to the same destination.

**For the path to the current location, the layout shell holds only the position.** Placing it per screen makes the same thing
appear at a different height on each screen. Its left edge aligns with the main content — if they are misaligned, the current
location looks like decoration outside the content. **When the content passed in is empty, the space itself collapses** — so a
screen with no hierarchy does not carry a blank strip at the top.

**When a screen could not be shown, or was not found, it is still shown inside the layout shell.** The sidebar list and the header
stay, and the not-found page has one link back to the admin home. Removing the whole layout shell loses both the current location
within admin and the next destination at once.

## Sidebar List

**Links are grouped by target, and each group has a heading.** Pressing a heading does not navigate — if it did, the user would
have to check every time whether to press the heading or the first item directly beneath it
([0053](../../../adr/0053-ui-component-interaction-seam.md)).

**Groups can be collapsed.** Opening and closing rides on the native `details` / `summary` mechanism. Holding browser state just
for opening and closing would show everything expanded once on the first render.

**The screen currently open is marked.** The marker appears only when the destination **exactly matches** the current location.
With prefix matching, adding a screen beneath marks both the list and the create screen.

## What Changes with Width

| Width | Sidebar list | header control |
| --- | --- | --- |
| Fits at the side | Always shown. Collapsible | A collapse control |
| Does not fit | Collapsed into an overlay | An open control |

**The links shown are the same at every width.** Changing the lineup by width creates places that cannot be reached only on narrow screens.

**The collapse control and the open control are separate components.** This keeps the result of a control at the same position
from changing with width. The band boundaries are held by [0051](../../../adr/0051-styling-system.md).

**The collapsed state is not remembered.** It would have to be remembered in a cookie, adding a per-request read just for the
layout shell. It persists across screens because navigation does not recreate the layout shell.

## What the Layout Shell Does Not Hold

**It does not constrain the content width.** Reading width and side margins are the content's responsibility; if both held a
width, telling which one is in effect would require reading each screen.

**It does not know what is shown at the right of the header or at the bottom of the sidebar.** It only provides the slots. The
link back to the customer-facing screens is one of them; the layout shell does not hold its destination.

**Not printed.** The header, the sidebar list and the skip link all exist for moving between screens; on paper they cannot be
pressed and only take up space.

## Related

- [`products/page.screen.md`](products/page.screen.md) — product list management

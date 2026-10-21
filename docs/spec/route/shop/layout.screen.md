# `(shop)` Outer Frame (Screen Requirements)

> Functional requirements are in [`layout.function.md`](layout.function.md).

The frame shared by every user-facing screen. It consists of the header, the body, the sidebar and the footer.

## header

| Area | Content |
| --- | --- |
| Site name | Link to the top page |
| nav | Products / Purchase history / My page / Admin (only for actors with the admin role) |
| Cart entry point | With a count. Pressing it shows the contents |

**The entry point to admin is not shown to actors without the role.** If it were built to refuse after pressing, the mere fact that an admin
surface exists would reach everyone ([`../admin/layout.function.md`](../admin/layout.function.md)).

**The count is the number of rows, not the total quantity.** Showing "3" for three of the same product reads as if there were three
kinds. **At zero items no number is shown.** Showing 0 leaves the symbol alone unable to say whether it conveys a state or
can be operated.

## Where the Cart's Contents Appear

| Width | Form | What the entry point means |
| --- | --- | --- |
| `lg` and up | A region permanently beside the body | A toggle that opens and closes the region |
| Below `lg` | A drawer over the body | A pull that opens the drawer |

**The need is the same at every width.** On wide widths the sidebar either appears or disappears, and on narrow widths the drawer either opens or
closes; both are the same need, "I want to see the contents."

**It is not stacked below the body.** The inner scroll would steal the outer scroll, and the user could not get back to the body.

**The form of the header's entry point (a toggle or the drawer's pull) is chosen by subscribing to the width, not by rendering both with CSS.**
This is an exception to "the switch is done with CSS" ([docs/rules.md](../../../rules.md#layout)) — the drawer traps focus, so if CSS hid it
while the DOM remained, focus would be trapped on wide widths. In exchange, **the entry point's initial render is always the permanent-side form**,
and it becomes pressable only after hydration.

**The sidebar itself is switched with CSS.** The body's width changes with the presence of the sidebar, so switching after
hydration would move the width of an already-rendered body afterwards.

### Sidebar (`lg` and Up)

- **While the cart is empty, the frame is not shown at all.** A frame with no contents taking space leaves only blank space, since the body's width
  does not change with the cart's presence
- **But while returnable line items are held, the frame remains even when empty.** If the frame vanished right after removing the last item,
  the way back would vanish with it
- **It can be closed.** While open, this region takes width from the body. If it could not be closed, a user who once added to the cart
  would keep reading the list narrowed. After closing, it can be reopened from the header's entry point
- Inside, the line items scroll locally, and the subtotal and the onward link sit outside the scroll

### Drawer (Below `lg`)

- It is pulled out **only by pressing**. There is no swipe from the screen edge (it conflicts with the browser's back gesture, and which one
  happens varies by device)
- It closes both by pressing the backdrop and by 「閉じる」 ("Close")
- How many items it holds is added to the description of the opened contents

## Links Shown in the Contents

The primary is 「購入手続きへ」 ("Proceed to checkout") and the secondary is 「カートを見る」 ("View cart") (`/cart`).

**The secondary is not dropped.** Checkout is inside authentication, and the only path for a logged-out user to check the cart's contents
full-screen is `/cart`. This container only has as much width as fits beside the body, and changing quantities or removing items gets awkward here
once line items pile up.

## footer

One sentence on what this repository is, and a link to the repository.

## Related

- Implementation `src/app/(shop)/layout.tsx` / `src/features/cart/` — [README](../../../../src/features/cart/README.md)
- The full-screen cart [`cart/page.screen.md`](cart/page.screen.md)

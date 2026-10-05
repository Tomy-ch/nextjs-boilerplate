# `/cart` Cart (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**The backend owns the cart's contents.** This screen does not re-add them and does not judge whether items can be bought
([0070](../../../../adr/0070-backend-role-separation.md)).

**No authentication required.** The actor is an httpOnly cookie identifier for a guest and the session when logged in;
when both exist the logged-in one takes precedence (the contract owns that precedence decision).

## Fetching

A single line: `GET /v1/carts/me`.

**Every fetch re-evaluates each line item.** Line items that became unbuyable since the last visit, or whose values changed,
show up as the result of this fetch.

**Line items come with their thumbnail source.** The contract returns the object key of the representative image, and the display URL is
assembled with the delivery origin's settings. **Products are not re-fetched per line item** — one cart fetch is enough to build the screen.

The outer frame (the sidebar and the count in the header) reads the cart from the same endpoint. Within the same render there is a single round trip,
and the body and the outer frame never show the cart at different points in time (the outer frame's side is
[`../layout.function.md`](../layout.function.md)).

## Conditions Flagged on a Line Item

Several conditions can be flagged at once. The contract owns which ones make an item unbuyable; this screen decides only the wording.
However, `discontinued` and `unpublished` are never flagged together — a discontinued item is also unpublished, but only the more specific `discontinued` is flagged. This screen never decides a precedence.

| Condition | Buyable |
| --- | --- |
| `notFound` / `unpublished` / `discontinued` / `outOfStock` / `insufficientStock` | No |
| `priceIncreased` / `priceDecreased` | Yes |

**The subtotal sums only the line items with no condition**, so a line item whose value merely changed is also excluded. There is no per-row subtotal
(it would multiply unit price by quantity, bringing amount calculation back to the frontend).

A line item with insufficient stock comes with the maximum that can be bought now. That maximum may be unknown.

## Interaction

All are sent with `<form action>` + Server Action ([0061](../../../../adr/0061-form-mutation-ux.md)).

| Operation | What is sent | Meaning in the contract |
| --- | --- | --- |
| Change quantity | The resulting quantity | **A set, not an increment.** The same request arriving twice gives the same result, so no key against double submission is needed |
| Remove a line item | A value that identifies the product | Succeeds even if the target is already gone. Unbuyable line items can be removed too |
| Empty the cart | — | The cart itself remains. The user's identity is not severed |

- The quantity range is **1 or more, up to the contract's maximum**. 0 is outside the contract's range; removing a row is the remove operation
- A quantity above stock is not itself rejected. Whether it can be bought shows up on the next fetch as a condition on the line item
- **Proceeding to checkout is possible when at least one line item is buyable**

**When a change succeeds, refetch including the outer frame.** Line items appear not only in the body but also in the outer frame attached to every screen
(the sidebar and the count in the header), so specifying a single path would leave the outer frame stale.

## Undo

A removed line item **can be returned to the cart at the quantity it had when removed**. Returning it uses the same endpoint as setting the quantity;
there is no dedicated endpoint.

It can be returned **until that product is back in the cart**. Whether undo is possible is derived from "is that product still in the cart,"
and no withdrawal signal is taken from the operation side.

The screen side does the remembering; **the server holds neither the removed line item nor the order before it disappeared**
(the server / client split in [0060](../../../../adr/0060-state-management.md)). Where it is remembered lies
outside the cart's container, so it survives removing the last line item.

## Carry-Over

At login, the guest's cart is merged into the actor of the established session. **Login succeeds even if it cannot be carried over**
([0079](../../../../adr/0079-auth-frontend-seam.md)). Logout also discards the guest
identifier.

## Failure Semantics

| Failure | Scope |
| --- | --- |
| Fetching | The whole screen. The route's `error` boundary receives it ([0080](../../../../adr/0080-error-handling.md)) |
| Operation | Only that operation. The cart display stays in its previous state |

Success is not notified. The result appears in the updated cart itself
([0063](../../../../adr/0063-mutation-result-notification.md)).

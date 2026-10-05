# `/checkout/complete` Purchase Complete (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**It sits inside authentication.** It shows only one purchase of the user's own; the contract does not distinguish someone else's purchase from a nonexistent one
and makes both "not found." Even if the target is rewritten, this screen never shows someone else's purchase.

## The URL points to the purchase shown

The response to placing the order is not rendered as is; **the purchase is refetched and rendered**. Because it lives at a separate URL, reloading and
sharing show the same content, and the back operation does not return to the pre-confirmation screen.

What the URL carries is the purchase identifier, **a value distinct from the order number shown to the user**. Its shape is checked before it is passed
to fetching (it is a value that can be rewritten by hand, and passing it unchecked would send a string the contract does not accept straight
out). A URL whose target cannot be read is made "not found." It was opened without placing an order, and there is no purchase
to show.

## Amounts

Subtotal, tax, shipping and total are all **the charged amounts as confirmed**, shown exactly as the backend decided them.
The confirmation screen could show only up to the subtotal.

A line item's unit price is **the value at the time of purchase** and does not move even if the product's current price changes. Only the product name
arrives resolved to the current name, so the name and the unit price refer to different points in time.

The reference converted amount in the display currency is added only to the total. The screen holds up even if it cannot be read.

## How Waiting Works

Loading is shown only for the receipt's contents. The heading and introduction are served without waiting.

**Even a URL with no target returns 200.** The response streams from the static shell, so by the time `notFound()` is reached the
headers have already gone out with 200. This cannot be solved by how it is written (under Cache Components a dynamic route streams from the static shell; ADR 0041 / ADR 0080). That it was not found is
conveyed by the not-found screen and `noindex`.

# `/products/[id]` Product Detail (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**No authentication required.** The same content appears whoever views it.

**The backend supplies the threshold for low stock.** What counts as "only a few left" differs per
product; what this screen owns is only what to show when the threshold is crossed
([0070](../../../../../adr/0070-backend-role-separation.md)).

## Fetching

A single item from `GET /v1/products/{id}`. It is a different endpoint from the list, and the items the list returns include neither the product description
nor the full set of images.

**Even a nonexistent ID returns a success status.** The response streams from the static shell, so by the time `notFound()` is reached the
headers have already gone out with 200. This cannot be solved by how it is written (under Cache Components a dynamic route streams from the static shell; ADR 0041 / ADR 0080). That it was not
found is conveyed by the not-found screen and `noindex`.

## metadata

The title is the product name, the summary is the first 160 characters of the product description with markup removed, and the canonical URL is its own path
(`/products/[id]`). The summary is omitted when there is no description.

**A product that is not found declares `noindex`.** The status cannot convey it (above), so this is the only way to tell search engines
"it does not exist."

The structured data is schema.org `Product` (name, category, image, price, stock availability). The description is not included because it
carries markup.

## Nonexistent Products

**Among fetch failures, only "not found" is handled separately.** A product with no publication date set (unpublished) and
a product that does not exist at all are both returned as "not found" by the contract, keeping existence secret. This screen does not
distinguish the two either.

Other failures are thrown as is and left to the `error` boundary. Holding per-classification branches here would copy the same branches
to every new screen ([0080](../../../../../adr/0080-error-handling.md)).

## Product Description

**It arrives as HTML and is not rendered as is.** It is not carried around as a raw string; it is passed only as a value that went through sanitization.
Holding it as a string would make whether it was sanitized before passing a matter of the caller's discipline.

A product may have no description.

## Images

Shown in the order the contract returns them. **A product may have no images at all.**

The display URL is assembled from the delivery origin and the path the contract returns. Assembly is done up to the boundary that can read the settings,
and the screen side receives only resolved URLs.

## Add to Cart

**This screen does not own the operation.** It is a change to the cart, and this screen only places the endpoint that `cart` exposes
([0026](../../../../../adr/0026-layout-shell-mount.md)). It cannot be pressed for a product with no stock at all.

**A quantity above stock is not itself rejected.** The backend owns the decision on whether it can be bought, and the result
appears as a condition on the cart's line item ([`../../cart/page.function.md`](../../cart/page.function.md)).

## Failure Semantics

| Failure | Scope |
| --- | --- |
| Not found | The whole screen. The route's `not-found` boundary receives it |
| Other fetch failures | The whole screen. The route's `error` boundary receives it |
| Add to cart | Only that operation. The display stays in its previous state |

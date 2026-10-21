# `/products/[id]` Product Detail (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen for checking one product and adding it to the cart.

## What It Shows

| Area | Content |
| --- | --- |
| Head | Breadcrumbs and the print operation |
| Images | Images laid out so they can be advanced, and the list of targets to advance to |
| Main information | Category, condition, product name, price, stock, publication date, and the add-to-cart operation |
| Product description | The formatted body as delivered. If there is none, the whole area is omitted |

## Images

**Regardless of count, they sit in the same structure, and the list of targets is always laid out below.** Changing the structure by count would make the look
shift at the boundary, and a single-image product and a multi-image product would look like different screens. With no images at all, a substitute image is placed as one image.

**Only real images can be pressed to enlarge.** The substitute image is a display that conveys "there is no image," and enlarging it
yields nothing. Pressable and unpressable images mix only for products without real images; within one product it is never
pressable sometimes and not others.

The advance operations are placed after the images. Placed before, they would be covered by the images and could not be pressed.

## How Stock Is Shown

| State | What is added |
| --- | --- |
| Out of stock | 「在庫なし」 ("Out of stock") in a strong color scheme |
| In stock but below the threshold | 「残りわずか」 ("Only a few left") in a weak color scheme |

Stock is shown as the number itself as well. The threshold value is not shown (the backend decides it per product, and it is no basis for the user's
decision).

## Breadcrumbs

**Placed.** It is a screen entered from the list, a category or the top page, and it has an ancestor that cannot be reached in one step from the global nav
([0026](../../../../../adr/0026-layout-shell-mount.md)). What it shows is not the path the user took but the hierarchy in the site's
structure.

**The current product name is truncated by width.** The contract's limit is long, and placed as is the current location alone would take several lines, losing the role
of letting the hierarchy be read at a glance. **It is not cut by character count** — so as not to break across grapheme boundaries,
and because the same character count takes different widths in Japanese and Latin text. Truncating loses no information (the full text is in the heading right below,
and the screen reader gets the full text).

## Responsive Layout

| Width | Images and main information | Add-to-cart operation |
| --- | --- | --- |
| `lg` and up | Two columns side by side | In the body's flow |
| Below `lg` | Stacked | Fixed to the bottom edge of the screen |

**It is fixed to the bottom edge because this screen is tall.** From the position reached after reading through the images and the product description, the user could no longer get back
to the operation (the rule that fixes an always-reachable operation to the bottom edge on bands without a sidebar is owned by [docs/rules.md](../../../../../rules.md#layout)). Whether to fix it is a decision of the screen's
assembly; the operation's component does not know where it was placed. Space for the fixed operation is left at the bottom of the
body.

## Printing

**Only the content goes to paper.** Operations that cannot be pressed (breadcrumbs, image advancing, the list, adding to the cart, the print operation
itself) only take up space on the page, so they are dropped.

**Only the first image is kept, and its width is held down.** A side-scrolling view cannot be advanced on paper, so laying them all out would fill the paper with
photos of the same product. Without holding down the width, even one image takes a whole page, pushing the key values to the next sheet.

## How Failure Looks

| Failure | What is shown |
| --- | --- |
| Not found | A heading saying it was not found, and **a link back to the product list** |
| Other | A generic message regardless of classification, an inquiry number and a retry link. The raw error body is not shown |

**Other failures are not worded differently by classification.** In production the body of a failure that occurred on the server is hidden,
and only the inquiry number reaches the boundary, so the classification cannot be read.

The not-found screen does not say "because it is unpublished." The contract's decision to keep existence secret would be overturned by the screen's
text.

## Related

- Implementation `src/features/products/` — [README](../../../../../../src/features/products/README.md)
- Back: [`/products`](../page.screen.md) (product list) / Next: `/cart` (cart)
- The cart in the outer frame [`../../layout.screen.md`](../../layout.screen.md)

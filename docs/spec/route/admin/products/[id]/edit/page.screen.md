# `/admin/products/[id]/edit` Editing a Product (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).
>
> The steps' contents are the same components as [`../../new/page.screen.md`](../../new/page.screen.md); **only the container differs**.

A screen people come to in order to fix one thing.

## Switching by aspect

**Switch among four aspects. There is no order.**

| Aspect | What can be fixed |
| --- | --- |
| Basic information | Product name, price, low-stock warning threshold, category |
| Description | Product description |
| Images | Product images |
| Publication | Status, publication date and time |

**The container has no order because the main thing in editing is "fixing one thing".** With an order, getting to the part to fix
means stepping through the steps. The task differs from first-time input (creation).

**There is no stock quantity field.** Creation has one. Stock is held by a different endpoint.

## Unselected aspects are kept

**Input in unselected aspects is still included in the submission as is.** If switching aspects erased half-written input,
several aspects could not be fixed together.

**Kept, but hidden.** "Being there" and "being visible" are different; if everything stayed visible, switching would be decoration.

## When the submission is rejected

**Move to the aspect with the error.** A container without an order has no mechanism that stops the user before moving on.
Without moving, the screen ends up with nothing red anywhere and yet the submission does not go through.

**Clear the previous result once the user moves to another aspect, types in a field, or rewrites the description.** The result
persists until the next submission, so keeping it shown makes a fix look unfixed. Removing or reordering images does not clear it.

**Only when the versions disagree, attach a link to reload.**

## Content When Opened

**Each field holds the saved content.** Images too: the saved ones are listed in the selection.

**Even if the submission is rejected, what was written stays as is.** Left to the input fields, values revert when the submission
completes, so the screen holds the values.

## Loading

**Until the saved content arrives, show only frames in the shape of the aspect switcher, the input fields and the submit button.**
Do not reuse the list's loading UI. That would make a form appear after table rows, and would not convey what is being waited for.

**The number of frames is not matched to the fields of the first aspect opened.** The loading side does not know the content, so
it cannot carry more meaning than conveying the form's shape.

## When Leaving

Same as creation. **No confirmation if nothing has changed from the content when opened.**

## Breadcrumbs

**商品一覧管理 > 商品名 > 編集** (Product list management > product name > Edit).

## Checking in the Catalog

Storybook's `Page/Admin/Products/Edit` holds each aspect, the rejected state, the version mismatch, a product with an empty
description, tablet and smartphone. The loading appearance is held by `Features/Admin/Products/Edit/Skeleton`.

## Related

- [`../../page.screen.md`](../../page.screen.md) — the list that leads to this screen
- [`../../new/page.screen.md`](../../new/page.screen.md) — the creation screen that shares the steps' contents

# `/admin/products/[id]/edit` Editing a Product (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../../../layout.function.md`](../../../layout.function.md).
>
> What is sent and how input is validated are the same as [`../../new/page.function.md`](../../new/page.function.md). This file
> records **only the differences**.

Rewrites an existing product.

## Stock quantity is not handled

**Stock quantity is not edited on this screen.** Stock is moved by addition; giving it the same "read and write back" shape as the
other fields cancels out whatever sold between reading and sending. Stock belongs to the restocking screen.

## Carrying the version

**Send the version as of loading.** Updating without it silently erases updates another actor made between loading and
sending.

**If the versions disagree, the update is rejected.** Only then is a link to reload attached. Attaching it to permission or
network failures as well would read as if retrying fixes them.

## Images are replaced as a whole set

**The sequence of images sent becomes the product's images as is.** It is not a diff. Therefore **saved images are included in
the submission too**. Sending without them erases the existing images.

**Saved images are not uploaded again.** They already have identifiers, and there is no reason to save the same content again.

## On success, go to the list

Same as creation. On success, the fetch that reads the product is made to refetch.

## Failures

Same as creation. In addition, a version mismatch is treated as something reloading resolves.

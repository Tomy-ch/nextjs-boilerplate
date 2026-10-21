# `/admin/products/new` Creating a Product (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../../layout.function.md`](../../layout.function.md).

Creates one product.

## Actor and Ownership

**Requires the admin role.** The outer frame decides whether the screen can be reached, but **the submission endpoint checks for
itself too**. The submission is an entry point separate from the screen and can be called without going through the screen. Unless
each entry point is closed, nothing is closed.

**The backend owns business validity.** This screen checks only shape (empty or not, readable as a number, length within the
limit); it judges neither whether the price is valid as a price nor whether the category exists
([0070](../../../../../adr/0070-backend-role-separation.md)).

## What Is Sent

| Field | Required | Notes |
| --- | --- | --- |
| Product name | ○ | The contract holds the limit |
| Price | ○ | Sent as a decimal string. Not converted to a number |
| Stock quantity | ○ | Stock at registration. Later changes belong to restocking |
| Low-stock warning threshold | — | If empty, the product is created without a threshold |
| Category | ○ | What is sent is the identifier. Distinct from the code filtering uses |
| Product description | — | Formatted. If empty, the product has no description |
| Product images | — | It can be created without them |
| Status | ○ | Stock and sales status. A separate axis from whether it is published |
| Publication date and time | — | If empty, it is created as unpublished |

**Price is not converted to a number.** It is carried as a decimal string. Treating it as a number introduces rounding and loses
precision before it is sent.

## One place owns input validation

**The same validation runs both before sending and after receiving.** It is checked before sending because learning it on the spot
is easier to fix than being told "missing" only after a round trip. It is checked after receiving because the sender can replace
the pre-send check.

**One place owns both the validation and the messages.** Copying them to both sides creates two ways of saying the same error,
and a state where only one of them can be fixed.

## Images are sent first

**Images are sent when chosen, and only their saved identifiers ride on the product submission.** Large bodies do not mix into the
product submission, and if one image fails, the others and the fields already entered remain.

**The accepted size and format are checked both before sending and after receiving.** On the relay path there is no layer that the
signed URL used to guarantee ([0075](../../../../../adr/0075-file-upload-seam.md)). The declared format is a value the sender can
set, so it is not relied on alone.

**The limit is set inside the limit the deployment target imposes on request bodies.** A limit set outside it has no effect,
because the deployment target cuts the request off first. The value is held by configuration.

**The display order is held by the sequence itself.** Holding a separate number leaves it undecided, after a move, whether the
sequence or the number is right.

## Submission

**One submission at the end.** Input in steps not currently shown rides on the same request.

**Input fields carry the "必須" (required) marker, but the browser is not allowed to block submission.** The browser cannot focus an
empty field in a hidden step, and submission stops without giving a reason. The screen points out empty fields.

**Do not submit until the images finish uploading.** Submitting midway creates a product without images the user thought were uploaded.

## On success, go to the list

**Creation cannot be undone.** Staying on the same empty form right after success lets a repeated press create the same product a
second time.

**On success, the fetch that reads products is made to refetch.** The list the user is sent to never shows a state without the
product just created.

## Failures

| What happened | What is shown |
| --- | --- |
| A shape error | Per-field messages, and a list of them |
| Insufficient role / connection dropped | Only that the submission itself did not go through |

**When there are per-field errors, no message about the whole is shown.** The same point would appear in two places.

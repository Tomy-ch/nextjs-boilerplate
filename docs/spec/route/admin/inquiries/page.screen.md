# `/admin/inquiries` Inquiry List (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen for comparing incoming inquiries and choosing the one to handle.

## What It Shows

| Region | Content |
| --- | --- |
| Heading | The screen's name and what can be done from here |
| Receiving status | One word saying whether updates are being received |
| List | Customer, last updated, started (hidden on narrow bands) |
| Pagination | One page back and one forward |

**No body is shown.** The contract does not put the body in the list, so showing it would mean fetching the history per row.
What was written is read by opening the inquiry.

**No title.** Inquiries have no title, and the only word that names a row is the customer's identifier. A row is opened by
clicking that identifier.

**No filtering.** The only condition the contract accepts is pagination, and inquiries, which have neither status nor assignee,
have no axis to filter on.

## How Updates Look

**Rows are not rewritten from delivered content.** An update notification carries only "which inquiry progressed how far"; it
contains neither the sort key nor the other columns. Replacing rows locally would disagree with the refetched list.

The list is refetched when a notification arrives. The refetch's loading applies only inside the list, and the receiving status stays.

## Loading and Empty

The loading UI lines up frames of row height. How many rows exist is unknown until fetched, so the count is kept to what fits
on screen comfortably.

When there are none, say so inside the list's frame.

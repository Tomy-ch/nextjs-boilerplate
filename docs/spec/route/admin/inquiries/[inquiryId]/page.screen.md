# `/admin/inquiries/[inquiryId]` Handling an Inquiry (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen for reading one exchange and replying to it.

## What It Shows

| Region | Content |
| --- | --- |
| Overview | The inquiry's identifier and the start of the exchange |
| Receiving status | One word saying whether updates are being received |
| Exchange | Date separators, and messages split left and right by sender |
| Reply field | Body input and submission |

**The operator's messages sit on the right.** In the same exchange, "me" switches with who is reading. Left and right are
reversed relative to the customer-side screen.

**It cannot show whose inquiry it is.** The exchange the contract returns carries only the sender type, and only the list row
carries the customer's identifier. Instead it shows the inquiry's identifier, so it can be matched against the list row.

## How Replies Look

**No submission by `⌘Enter`.** An operator's reply is sent after it is fully written; if finishing typing becomes the
submission, a half-written reply reaches the customer.

How submitting, success and failure look is the same as the customer-side submission
([`../../../shop/mypage/inquiry/page.screen.md`](../../../shop/mypage/inquiry/page.screen.md)).

## Headings

**Not shown on screen.** The current location in the breadcrumbs carries the heading; adding one would put the same screen name
twice in a row.

**But it is placed in the document.** Leaving it out would leave assistive technology no way to learn "which screen am I on"
other than walking the breadcrumbs. The screen name is placed as an invisible heading, and the screen's appearance does not
change.

## Hierarchy

Show the one level back to the list. The current location does not show the identifier — an inquiry has no title, and the raw
identifier does not work as a name in the hierarchy.

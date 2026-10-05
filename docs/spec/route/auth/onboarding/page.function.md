# `/onboarding` Registration (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).

A user using this system for the first time creates their own registration information. Authentication itself has been completed by
[`/login`](../login/page.function.md); what is resolved here is only the registration side.

## Actor and Ownership

**Only actors who are authenticated but have no user record yet can enter.** Authentication and registration are separate states; the
former is resolved only by login, the latter only by registration. An unauthenticated actor who lands here is sent to login, and a
registered actor is sent back to the return destination. This is **so the action that creates a second user is never shown**.

**The entry points of protected screens go through the same check.** The check on authentication and registration is held closest to
the data source, and the screen side only turns its result into a destination ([0079](../../../../adr/0079-auth-frontend-seam.md)).
Where a bounced actor was is carried around as the return destination and released when registration succeeds.

**The backend owns business validity.** This screen checks only shape (empty or not, matching the format, length within the limit);
it judges neither whether the address exists nor whether the contact details belong to the person
([0070](../../../../adr/0070-backend-role-separation.md)).

## What Is Sent

| Field | Required | Notes |
| --- | --- | --- |
| Family name / given name | ○ | The contract holds the limit |
| Email address | ○ | Checked up to the format |
| Phone number | ○ | Digits only, without separators |
| Postal code | ○ | Address autocomplete is also looked up with this value |
| Prefecture | ○ | What is sent is the name. The options come from the master |
| City / district and street number | ○ | |
| Building name and room number | — | Empty means "not entered", not the value of an empty string |

## One place owns input validation

**The same validation runs both before sending and after receiving.** It is checked before sending because learning it on the spot is
easier to fix than being told "missing" only after a round trip. It is checked after receiving because the sender can replace the
pre-send check ([0062](../../../../adr/0062-form-input-validation.md)).

**One place owns both the validation and the messages.** Registration and changing registration information go through the same
rules. Copying them to both sides creates two ways of saying the same error, and a state where only one of them can be fixed.

## Address Autocomplete

**Look up the address from the postal code and fill only the fields that are determined.** One postal code may point to several town
areas, and taking the first candidate unconditionally silently fills in an address the user did not choose. Street numbers and beyond
are not part of autocomplete, so the town area is filled only when the district and street number field is empty.

**Registration can continue even if the lookup fails.** The contract specifies that failures of the external lookup are returned not
as a failure but as empty candidates, and the screen lets the user continue entering by hand
([0080](../../../../adr/0080-error-handling.md)).

**Separate "no match" from "the autocomplete mechanism is not working".** The former fills in if the postal code is corrected; the
latter never fills in however many times it is looked up. The contract returns these two separately, so **what the screen tells the
user is separate too**.

## Step Progression

**The user cannot proceed from a step that is not filled in.** The receiving side runs the same rules, but learning it on the spot is
easier to fix. The last step accepts no input and exists only for reading back the values about to be sent.

## Submission

**One submission at the end.** Input in steps not currently shown rides on the same request.

**Submitting twice still creates only one user.** The point that built the screen creates a key pointing to this one registration
and puts it in the submission. However many times it is sent from the same screen, the key is the same, and the receiving side treats
the second as a replay of the first. Reopening the screen gives a different key, but if registration has completed by then, this
screen cannot be entered.

**A conflict is conveyed as a failure to register.** The user has no way to distinguish a registration that has already completed
from one that duplicates another registration.

**On success, move to another screen.** Registration is not an operation that stays here; there are **screens that can be opened only
after registering** ([0063](../../../../adr/0063-mutation-result-notification.md)). The destination is the carried return destination,
or My Page if there is none.

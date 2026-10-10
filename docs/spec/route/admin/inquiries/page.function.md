# `/admin/inquiries` Inquiry List (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).

## Actor and Ownership

**Requires the administrator role.** The backend returns `403` to an actor without the role, and this screen treats it as a
failure as is (the screen does not own the check).

## Fetching

A single source: `GET /v1/inquiries`. One page, most recently updated first.

Pagination is keyset: the response's `nextCursor` is passed as is as the next starting point. **The URL remembers where to go back to**
— a cursor only points to "the next position", so the starting points passed through are stacked in the URL.

**When a URL has lost its starting point, the stacked trail is discarded.** Users can edit the URL directly, so a URL with only
the starting point gone can arrive. Without discarding, "previous" becomes clickable on the first page.

## Subscription

Issue a ticket with `POST /v1/inquiries/feed/stream-ticket` and subscribe to the update feed.

**No start position is passed.** The list fetch does not return a feed position, so the subscription starts from the position
the ticket bundled. Updates missed around a reconnect are recovered by the next update, and until they are, what is visible is
a list one update behind.

**The feed position and the conversation position are different things.** The position a feed event carries in its body is the
position within the conversation, not the feed's resume position. Confusing them shifts the resume position in an environment
with two or more inquiries.

The rules for re-establishing and terminating the subscription are the same as on the customer-side screen
([`../../shop/mypage/inquiry/page.function.md`](../../shop/mypage/inquiry/page.function.md)).

## Failures

| Contract response | Screen |
| --- | --- |
| 401 | Send back to sign in again |
| 403 | Insufficient role. The subscription is terminated |
| 5xx | The error boundary catches it |

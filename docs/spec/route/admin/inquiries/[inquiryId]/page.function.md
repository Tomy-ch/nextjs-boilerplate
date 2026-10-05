# `/admin/inquiries/[inquiryId]` Handling an Inquiry (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).

## Actor and Ownership

**Requires the administrator role.** The backend owns the role check, and an actor without it gets `403`.

The **server decides** the sender type. A reply that enters through this endpoint is recorded as the operator's, and the submission cannot specify it.

## Fetching

A single source: `GET /v1/inquiries/{inquiryId}/messages`. Its shape and the meaning of its start position are the same as the
customer-side history. A nonexistent inquiry returns `404`.

The dynamic segment is settled as an identifier before it reaches the fetch. A request whose shape does not match the contract is
returned by the fetch as `not-found`.

## Subscription

**This screen does not subscribe to the conversation itself.** The contract's subscription endpoints are two, "my inquiries" and
"update feed", and there is none through which the operator subscribes directly to an arbitrary single inquiry.

Instead it subscribes to the feed and refetches the authoritative copy **only when the open inquiry moves**. A new message appears
not as a delivered body but as the refetched authoritative copy. Since the feed carries no body, this is not a
detour but the only path.

## Submission

`POST /v1/inquiries/{inquiryId}/messages` is sent as a Server Action round trip.

**The screen puts the reply target into the submission.** The operator moves between several inquiries, so the server
cannot decide "the one currently open".

The idempotency key and the body are handled as in the customer-side submission
([`../../../shop/mypage/inquiry/page.function.md`](../../../shop/mypage/inquiry/page.function.md)).

On success, **only the one open inquiry** is refetched. The feed tells the list.

## Failures

| Contract response | Screen |
| --- | --- |
| 403 | Insufficient role |
| 404 | Nonexistent inquiry |
| 422 | Field error on the body |

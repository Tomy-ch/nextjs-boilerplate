# `/mypage/inquiry` Inquiries (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

**Requires a registered user.** It reads and writes only the user's own inquiry, and the path carries no one else's identifier.
Opened unauthenticated, it sends the user to login. An actor that is authenticated but not registered as a user is sent to registration (`/onboarding`),
and returned to this screen after registering.

**One inquiry per user.** There is no creation endpoint; **the first post creates the inquiry**.
There are no state transitions (close / reopen) and no assignee (the contract has none).

The backend owns the content of the conversation. This screen decides only the ordering and the wording
([0070](../../../../../adr/0070-backend-role-separation.md)).

## Fetching

A single line: `GET /v1/inquiries/me/messages`. One page is taken in ascending order of position.

**The subscription start position the response returns is passed to the subscription as is.** The response contains only positions up to it, so
anything added between fetching and subscribing is not missed. The position is not assembled on the screen side.

An actor with no inquiry yet gets an empty conversation and start position `0` as a success.

**There is no link for going back through older messages.** The contract returns the next position, but this screen does not use it.

## Subscription

**The browser connects directly to the backend's stream** ([0074](../../../../../adr/0074-runtime-communication-seam.md)).

| Stage | What happens |
| --- | --- |
| Ticket issuance | A same-origin Route Handler relays it and returns the URL to connect to |
| Connection | Events after the position the fetch returned arrive |
| Ordering | Buffered over a short time window and put back in ascending order of position before being handed to the screen |
| Folding | Each arriving message is added to the list. The same identifier is folded into one entry |

**No subscription starts for a user with no messages yet.** There is nothing to subscribe to, so the issuance endpoint is not called either.

**Gaps and out-of-order arrival are both normal.** There is no decision to wait until a gap fills. When an event arrives later than the window,
it is not inserted at its position; instead **the authoritative copy is refetched**, and the subscription is re-established at the refetched position.

**Reconnection is done in-house.** Only 5xx and network drops are covered; session expiry, loss of permission and having nothing to subscribe to
end it (reconnecting would take the same path). No reconnection happens while the screen is not visible.

**Credentials ride in the query as a ticket.** A URL containing the ticket is not put into text, logs or span attributes.

## Submission

`POST /v1/inquiries/me/messages` is sent as a Server Action round trip
([0061](../../../../../adr/0061-form-mutation-ux.md)).

- **Only the body is sent.** The server decides the sender type
- **An idempotency key is always attached.** A message has no natural key, so a resend just because the response did not arrive would become
  a second message. The key keeps the same value until it succeeds, and is regenerated once it succeeds
- **Submission does not go through the subscription path.** A submission failure needs to come back to the screen as a classification, and the subscription has no such round
  trip
- A sent message appears in **the refetched authoritative copy**, not via the subscription. The refetch response returns a new subscription start position,
  so the submission and subscription positions line up in the same round trip

**No reconciliation by a client-side identifier.** The contract's submission does not accept one, so there is no path to match it against the echo.

## Handling the Body

| Rule | Value |
| --- | --- |
| Length | The range the contract (`openapi/api.gen.yaml`) defines. The unit is Unicode code points |
| Leading and trailing whitespace | Dropped before sending. If the result is empty, it is not sent |

The screen does not copy the numbers; it passes the contract-derived values to the input as is.

## Failures

| Contract response | Screen |
| --- | --- |
| 401 | Falls to signing in again (the subscription is ended) |
| 409 | Shown next to the submission field as a submission failure |
| 422 | Shown as a field error on the body |
| 5xx | The error boundary for fetching; next to the submission field for submission |

## Deployments That Cannot Represent a Subscription

**With `APP_API_MODE=mock` there is no subscription.** The generated mock cannot represent SSE, so in a mock deployment the issuance fetch
endpoint refuses issuance itself. The screen stops in the "nothing to receive" form, while showing the conversation and
submitting keep working. **What stops it is the app side, not the mock**; without the refusal the browser would keep reconnecting to a connection target
that does not exist.

## Entry Point

The 「お問い合わせ」 ("Contact us") placed on out-of-stock products in the product list leads into this screen. **Which product it was is not carried over**
— there is one inquiry per user, and it has no per-product thread.

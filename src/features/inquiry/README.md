---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features] # Exception: whole-screen stories
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/inquiry/__mocks__/**"
  - "src/features/inquiry/inquiry.fixture.ts"
---

# inquiry

The screen slice where the user exchanges messages with support. It is also the surface where an arriving message is put on
screen **without waiting for a refetch**.

## What Belongs Here

- Orchestrating the fetching and sending of the exchange (fetching in a Server Component, sending in a Server Action)
- Folding arriving events into the screen's state (reconciling with the authoritative copy, date separators)
- How to state whether messages are being received (mapping network presence and subscription state to one label)

## What Does Not Belong Here

- The subscription itself (connecting, ordering, deduplication, reconnecting and giving up are decided by `adapters/client/stream`)
- Ticket issuance (a same-origin Route Handler relays it: `src/app/api/inquiries/me/stream-ticket/`)
- State transitions of an inquiry (the contract has none. There is only a start and a last update; neither close nor reopen exists)
- The operator-side list and replies (owned by `admin`. Features do not reference each other directly)

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/mypage/inquiry` | [`screen`](../../../docs/spec/route/shop/mypage/inquiry/page.screen.md) / [`function`](../../../docs/spec/route/shop/mypage/inquiry/page.function.md) | Required |

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetInquiriesMeMessages` | Fetches the history. The response's `streamCursor` becomes the subscription's starting position |
| `PostInquiriesMeMessages` | Sends one message. The first message creates the inquiry |
| `PostInquiriesMeStreamTicket` | Issues a ticket for the endpoint that opens the subscription. The browser calls it through the relay (`/api/`) |
| `GetStream` | The subscription itself. **The browser opens it directly against the backend**, so this slice does not build the URL |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Inquiry | success | `Page/Mypage/Inquiry/Default` |
| | empty | `Page/Mypage/Inquiry/Empty` |
| | long body, unbroken strings | `Page/Mypage/Inquiry/LongBody` |
| Message list | sending | `Features/Inquiry/Thread/MessageList/Sending` |
| | empty | `Features/Inquiry/Thread/MessageList/Empty` |
| Composer | idle / pending / field error | `Features/Inquiry/Thread/Composer/{Default,Pending,Invalid}` |
| Receiving status | 7 kinds | `Status/ConnectionStatus/*` |
| Exchange and sending | success / empty / long body | `Features/Inquiry/Thread/Conversation/{Default,Empty,LongBody}` |
| Loading UI | loading | `Features/Inquiry/Thread/Skeleton/Default` |

**The screen has no error state of its own.** A send failure is shown next to the composer, and a fetch failure is caught by the route's
`error` boundary (`src/app/(shop)/mypage/inquiry/error.tsx`).

## Structure

| File | Role |
| --- | --- |
| `actions.ts` | The Server Action for sending |
| `form-names.ts` | The names of the fields a send carries. **Holds no validation** — the inputs need only the spelling |
| `parse-message-form.ts` | Extracts the body and the idempotency key from the submitted content |
| `connection-status.ts` | Maps the subscription state and network presence to the one word shown on screen |
| `facade/paths/` | The routes this feature owns. **The entry other features point at** |
| `thread/page-content.tsx` | Fetches the history and assembles it |
| `thread/view.tsx` | The full-screen display. Fixes the height of the container |
| `thread/ui/conversation/` | The client island that ties together subscribing, sending and folding |
| `thread/ui/message-list/` | The list of messages. Holds neither fetching nor reordering |
| `thread/ui/composer/` | The composer. Holds the draft and clears it only when a send succeeds |
| `thread/ui/skeleton/` | Loading UI. Places a container of the same height as the finished screen first |
| `inquiry.fixture.ts` | A fixed exchange read by stories and tests |
| `__mocks__/actions.ts` | Replaces the Server Action in the catalog |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching and sending the history, subscribing (`client/stream`), validating events (`client/api/inquiries`), the body limit (`client/api/inquiry-limits`) |
| `model` | Display models (`InquiryMessage` / `InquiryHistory`), folding the authoritative copy with what was received, `ActionState`, idempotency keys |
| `components` | The conversation surface (`Message` / `Bubble` / `Marker` / `MessageScroller`) and the receiving status |
| `capabilities` | Network presence (`use-online-status`) |
| `observability` | Puts rendering on spans |

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `sendInquiryMessageAction` | `actions.ts` | `ActionState<void, "body">` | `revalidatePath("/mypage/inquiry")` | A field message (the body; for both pre-send validation and a contract 422), or a message next to the composer. If authentication has expired, `redirect` to login with this screen as the return destination |

**An idempotency key is always attached.** A message has no natural key, so resending a send whose response merely
did not arrive produces a second message. The key keeps the same value until a send succeeds and is regenerated at that point.

## Test Perspectives

- [ ] What has entered the refetched authoritative copy is dropped from the copies received through the subscription (the same message is not listed twice)
- [ ] Even when messages arrive out of order, they are listed in ascending order of position
- [ ] For a user with no messages yet, the subscription is not started (the ticket endpoint is not called)
- [ ] When a send succeeds the draft is cleared, and when it does not the draft remains
- [ ] When a send succeeds the idempotency key changes, and when it does not the key stays the same

## Operations

- **The subscription carries only "additions not yet refetched".** It is not a copy of the fetched list,
  so it is not put in `stores`. Leaving the screen makes the next fetch return the latest, so losing it does not break correctness
- **The starting position comes from the fetch response.** The endpoint that returns the history also returns the subscription position at that moment,
  so no gap opens between fetching and subscribing. Building the position yourself drops the events in that gap
- **The signal to refetch comes from the subscription.** A subscription that finds an event delayed beyond the window asks for the authoritative copy
  to be refetched instead of inserting it at the position where it arrived. The receiving side calls `router.refresh()` and resumes the
  subscription at the new position
- **Sending goes outside the subscription.** A send failure must be returned to the caller as a classification, and the subscription
  has no such round trip. A sent message appears in the refetched authoritative copy
- **Optimistic additions are not reconciled by identifier.** The contract's send does not accept a client-side identifier,
  so there is no path to match them on the echo. Instead, the body being sent is placed at the end and replaced by the authoritative copy once the send
  succeeds. **It is placed with the same orientation and surface as a confirmed message**, so the replacement is not visible
- **The receiving status stays shown.** If it were shown only while disconnected, its absence would not tell from the screen whether
  it is "connected" or "not subscribed at all". Network presence is checked first because
  a subscription while the network is down is always in the middle of reconnecting
- **`⌘Enter` / `Ctrl+Enter` sends.** The operation is contained within this screen, so the composer holds it directly
  without building a registration mechanism
- **There is no heading.** The screen's height is used up by the exchange and the composer; what this screen is
  is shown by the global nav and the tab title

## Not subscribed in mock deployments

Under `APP_API_MODE=mock`, the ticket fetch endpoint refuses to issue a ticket (`adapters/server/api/inquiries-stream.ts`).
The screen stops in the "nothing to receive" state, while displaying the exchange and sending still work. **This state is what crawling and capture
are run against** — without the refusal, reconnecting would never stop and the image would not be the same.

## Related ADRs

- [0074](../../../docs/adr/0074-runtime-communication-seam.md) — The contract of the subscription seam (transport / authentication / ordering / reconnection)
- [0061](../../../docs/adr/0061-form-mutation-ux.md) — Sending is a Server Action round trip
- [0060](../../../docs/adr/0060-state-management.md) — Do not keep a copy of server state on the client
- [0027](../../../docs/adr/0027-directory-structure.md) — Physical placement and co-location

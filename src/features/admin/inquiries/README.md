---
test-requirement: [feature, component, unit]
coverage-exclusions:
  - "src/features/admin/inquiries/inquiries.fixture.ts"
---

# admin/inquiries

The screen slice for comparing the inquiries that arrived and answering one of them
(`/admin/inquiries` and `/admin/inquiries/[inquiryId]`).

**This README does not declare the import ceiling.** Boundaries are declared at an element's root, and the root of the element containing this directory is [`admin/`](../README.md) ([0021](../../../../docs/adr/0021-frontend-responsibility.md)).

## What Belongs Here

- Orchestrating the list fetch and pagination, and fetching one inquiry's exchange
- Assembling the reply submission and showing its result
- Subscribing to the update feed, and refetching in response

## What Does Not Belong Here

- The subscription itself (connecting, ordering and reconnecting are the domain of `adapters/client/stream`)
- The sort order and filter axes (the contract decides; there is only most recently updated first)
- Asserting the role (the reply Server Action lives in the app layer and asserts there)
- The user-side inquiry screens (the domain of `inquiry`; features do not reference each other directly)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/admin/inquiries` | [`screen`](../../../../docs/spec/route/admin/inquiries/page.screen.md) / [`function`](../../../../docs/spec/route/admin/inquiries/page.function.md) | Role: admin |
| `/admin/inquiries/[inquiryId]` | [`screen`](<../../../../docs/spec/route/admin/inquiries/[inquiryId]/page.screen.md>) / [`function`](<../../../../docs/spec/route/admin/inquiries/[inquiryId]/page.function.md>) | Role: admin |

The parent's ([`admin`](../README.md)) Authorization section applies to these screens as is.

operationIds used.

| operationId | Purpose |
| --- | --- |
| `GetInquiries` | Fetching the list. Most recently updated first, without message bodies |
| `GetInquiriesDetailMessages` | Fetching one inquiry's exchange |
| `PostInquiriesDetailMessages` | Sending a reply. The server decides the sender kind |
| `PostInquiriesFeedStreamTicket` | Issuing a ticket for the endpoint that subscribes to the update feed |

**There is no endpoint that subscribes to a conversation itself.** The contract has two — "your own inquiries"
and "the update feed" — and no endpoint through which operators subscribe directly to an arbitrary single
inquiry. Updates to the one that is open are learned from the feed, and the authoritative data is refetched.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| List | success | `Page/Admin/Inquiries/List/Default` |
| | empty | `Page/Admin/Inquiries/List/Empty` |
| Handling | success | `Page/Admin/Inquiries/Detail/Default` |
| Exchange list | success | `Features/Admin/Inquiries/Detail/MessageList/Default` |
| | Sending | `Features/Admin/Inquiries/Detail/MessageList/Sending` |
| | Empty | `Features/Admin/Inquiries/Detail/MessageList/Empty` |
| List table | success / with pagination / empty / phone width | `Features/Admin/Inquiries/List/Table/{Default,WithPagination,Empty,Mobile}` |
| List subscription | Waiting | `Features/Admin/Inquiries/List/FeedWatch/Default` |
| List loading UI | loading | `Features/Admin/Inquiries/List/Skeleton/Default` |
| Exchange and reply | success | `Features/Admin/Inquiries/Detail/Conversation/Default` |
| Reply field | idle / pending / field error | `Features/Admin/Inquiries/Detail/ReplyForm/{Default,Pending,Invalid}` |
| Handling loading UI | loading | `Features/Admin/Inquiries/Detail/Skeleton/Default` |
| Hierarchy | Under the list | `Features/Admin/Inquiries/BreadcrumbTrail/OneLevel` |
| Receiving state | 7 kinds | `Status/ConnectionStatus/*` |

## Structure

| File | Role |
| --- | --- |
| `form-names.ts` | The field names the reply submission carries. **Holds no validation** |
| `form-state.ts` | The types of the reply result and the submission target, and the wording when decoding fails |
| `parse-reply-form.ts` | Extracts the reply target, body and idempotency key from the submitted content |
| `connection-status.ts` | Maps the feed state and whether the line is online to one word shown on screen |
| `query.ts` | The side that builds pagination URLs |
| `read-location.ts` | The side that reads pagination URLs |
| `list/page-content.tsx` | Interpreting the URL and assembling the list |
| `list/results.tsx` | Fetching one page, and pagination |
| `list/view.tsx` | The list screen. Places the subscription outside the list body |
| `list/ui/table/` | The inquiry table. Holds no message bodies |
| `list/ui/feed-watch/` | Subscribing to the update feed, and the receiving state |
| `list/ui/skeleton/` | The list loading UI |
| `detail/page-content.tsx` | Fetching and assembling one inquiry |
| `detail/view.tsx` | The handling screen. Stacks the overview and the exchange vertically |
| `detail/breadcrumb-content.tsx` | The hierarchy down to the current location. Used by the `@breadcrumb` slot |
| `detail/ui/conversation/` | A client island bundling subscription, reply and display |
| `detail/ui/message-list/` | The exchange as seen by operators |
| `detail/ui/reply-form/` | The reply input field |
| `detail/ui/skeleton/` | The handling loading UI |
| `ui/breadcrumb-trail/` | The hierarchy leading back to the list |
| `inquiries.fixture.ts` | A fixed list read by stories and tests |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching the list and exchanges, sending replies, subscribing to the feed |
| `model` | Display models (`InquirySummary` / `InquiryHistory`), date separators, `ActionState`, idempotency keys |
| `components` | Tables, the conversation surface, pagination, receiving state |
| `capabilities` | Whether the line is online (`use-online-status`) |
| `observability` | Putting rendering on spans |

## Action Return Contract

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `replyInquiryAction` | **`src/app/admin/inquiries/actions.ts`** | `AdminInquiryReplyState` | `revalidatePath` only the one that is open | Field wording (the body), or wording next to the reply field |

**The screen puts the reply target on the submission.** Operators move between several inquiries, so "the one
open now" cannot be decided on the server side.

**Hence it lives in the app layer.** Since it can name any inquiry, the role must be asserted, and only app may
touch `adapters/server/auth`, which the assertion uses. **This screen does not decide its own submission
target**; it receives it from the route through props (`AdminInquiryReplyAction` in `form-state.ts`).

## Test Perspectives

- [ ] The origins passed through are stacked into the URL, and the back operation pops them one level at a time
- [ ] A URL whose origin has disappeared is read as the first page (「前へ」 ("previous") cannot be pressed)
- [ ] Updates to inquiries other than the open one cause no refetch
- [ ] When a reply succeeds, only the open inquiry is refetched

## Operations

- **The subscription sits outside the list body.** Inside it, every refetch would unmount the subscription
  along with it, and each refetch would start over from issuing the ticket
- **Rows are not rewritten with what the feed carries.** It carries only "which inquiry has progressed how
  far", with neither the sort key nor the other columns
- **The feed position and the conversation position are different things.** The position a feed event carries
  in its body is a position within the conversation, not the feed's resume position. Mixing them up shifts
  the resume position in an environment with two or more inquiries
- **Subscribe without passing a start position.** The list fetch does not return a feed position, so the
  subscription starts from the position the ticket bundled. Missed updates are recovered by the next update
- **Operators' messages align to the right.** In the same exchange, "me" switches depending on who is reading.
  That is why no components are shared with the user side; sharing them would leak the direction judgment to
  both as an argument
- **Whose inquiry it is cannot be shown.** The exchanges the contract returns carry only the sender kind; only
  the list rows carry the user identifier

## Not subscribed in mock deployments

The reason is the same as on the user side ([`../../inquiry/README.md`](../../inquiry/README.md)). Both the list
and the handling screen display and send while left in the stopped-subscription state.

## Related ADRs

- [0074](../../../../docs/adr/0074-runtime-communication-seam.md) — The contract of the subscription seam
- [0073](../../../../docs/adr/0073-pagination-fetch-boundary.md) — Cursor-based pagination
- [0061](../../../../docs/adr/0061-form-mutation-ux.md) — Submission is a Server Action round trip
- [0070](../../../../docs/adr/0070-backend-role-separation.md) — The responsibility line with the backend

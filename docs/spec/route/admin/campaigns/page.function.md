# `/admin/campaigns` Campaign List (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../layout.function.md`](../layout.function.md).

Surveys how each campaign's distribution stands, and stops a distribution.

## Actor and Ownership

**Requires the admin role.** The outer frame decides whether the screen can be reached.

**The backend owns whether a code can be claimed.** This screen reads the period, the counts and the suspension the contract
returns, and sends the suspension; it neither hands out coupons nor decides who may claim one
([0070](../../../../adr/0070-backend-role-separation.md)).

## What is listed

**Every campaign, newest distribution start first, including suspended ones and ones whose period has passed.** The order is the
contract's own; the screen does not reorder the rows it received.

## Pagination counts by position

**The contract takes a page number and a page size, and returns the total count, so any page can be jumped to.** It returns
neither a page count nor the position of the page.

**The number of pages is derived from the total count.**

**The screen decides the number of items per page.** The limit the contract accepts is a line meaning "anything above this is
rejected", and moves for reasons unrelated to how many items can be listed readably.

**The page number is the only thing in the URL.** The contract offers no filtering.

**Users can edit the URL directly.** An unreadable page number, or one above the contract's cap, falls back to the first page.
The result of the fallback is visible as the current page in the pagination, so it is the kind that may fall back.

**The default is not put in the URL.** It would give the same list two addresses.

## Four statuses

**The contract returns no status.** It returns the two ends of the distribution period and when the campaign was suspended; which
status a row is in is decided by holding those against "now".

| Status | When |
| --- | --- |
| 「停止」 (suspended) | A suspension time is present, wherever "now" falls in the period |
| 「配布前」 (before distribution) | "Now" is before the start |
| 「配布中」 (distributing) | "Now" is at or after the start, and before the end |
| 「期間外」 (out of period) | "Now" is at or after the end |

**Suspension comes before the period.** It cannot be undone, and it stops the distribution regardless of the period.

**The period includes its start and excludes its end** (the contract). At the end time exactly, the campaign is out of period.

**"Now" is the time of the request, read on the server.** A row's status does not advance while the screen stays open; it is
decided again when the list is fetched again.

**A fully distributed campaign is not a status of its own.** Distribution can be finished by the period, by suspension, or by
reaching the total limit, and only the first two are statuses; reaching the limit is shown in the remaining count.

## This screen assigns colors to statuses

**Colors are attached to handling categories**, in the same way as the product list
([`../products/page.function.md`](../products/page.function.md)).

| Status | Category | Appearance |
| --- | --- | --- |
| 「配布中」 | Can be claimed | Filled |
| 「配布前」 | Involves waiting | Caution color |
| 「期間外」 | Done with | Outline only |
| 「停止」 | A settled, irreversible handling | Inverted lightness |

**Suspension is differentiated on an axis separate from the others**, as discontinuation is in the product list. A period that
has passed is an ordinary end; a suspension is a decision someone took and cannot take back.

## The Remaining Count

**The remaining count is the total limit minus the number issued.** The contract delegates reading it to this difference. The
number issued does not go down when a coupon returns to unused, so the remaining count does not grow back either.

**A negative remaining count does not occur.** The contract declares that the total limit is not exceeded even under concurrent
claims, so the screen does not guard against it.

## Suspension is irreversible

**A confirmation is inserted.** A mistaken press cannot be undone.

**Coupons already distributed are not invalidated** (the contract). Suspension stops the distribution, not the coupons handed
out. The screen says so before the suspension and again after it — without it, suspending reads as taking back what was already
handed out.

**Suspension is offered on every row except suspended ones** — before distribution, distributing, and out of period alike. The
only thing the contract rejects is suspending a campaign already suspended; a campaign not yet started can be stopped before it
starts, and the screen does not stop a request the contract accepts. A suspended row offers nothing, since running it again
changes nothing.

## Submission

**What is sent is the target campaign, with an idempotency key.** The code goes with it so that the result can name the row it
is about.

**The key is made each time a row's suspension is chosen**, because the screen offers the operation on many targets
([`docs/rules.md`](../../../../rules.md#forms)). A resend of the same submission carries the same key and folds into the first.

**On success, stay on this screen and refetch the list.** The suspension is reflected at once, so the refetched list shows the
row as suspended. The result is read in the list itself, so there is no other screen to move to.

## Failures

| What happened | Handling |
| --- | --- |
| Already suspended, or the same submission still in progress (409) | The status alone does not tell the two apart, and both are answered the same way: a message only this screen gives, and a refetch of the list so the row falls to its true state |
| The target or the key was not sent | Treated as something to fix by reopening the screen |
| Temporarily not accepted, or any other failure | The catalog's wording for that category |
| The list cannot be fetched | Only the main content is replaced; the layout shell stays ([0080](../../../../adr/0080-error-handling.md)) |
| Insufficient role | Does not appear on this screen, because the layout shell stops it at the entry point |

## Related

- [`../layout.function.md`](../layout.function.md) — authorization and the layout shell
- Contract: `GET /v1/campaigns` / `POST /v1/campaigns/{campaignId}/suspend` in `openapi/api.gen.yaml`
- [`src/features/admin/README.md`](../../../../../src/features/admin/README.md) — the implementation

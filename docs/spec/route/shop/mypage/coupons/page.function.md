# `/mypage/coupons` Coupons (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Actor and Ownership

The user's own coupons. **Which coupons are held, and whether a code yields one, are the backend's judgments**; this screen does not
decide either.

**The status of each coupon is decided here, by comparing its times with "now".** The contract returns no status and asks for the comparison
on every judgment (`CouponResponse` in `openapi/api.gen.yaml`). When several hold at once, the one that can no longer change is said first:
used, then expired, then not yet usable. "Now" is read by the route and passed down, so it can be fixed in verification
([`config/clock`](../../../../../../src/config/README.md)).

## Fetching

One stream: `GET /v1/users/me/coupons`, in the order the contract returns (newest issued first), without paging. Nothing is cached; each
render fetches again.

## Submission

`<form action>` + `useActionState` + `useFormStatus` ([0061](../../../../../adr/0061-form-mutation-ux.md)), to
`POST /v1/campaigns/claims`.

- **The code is sent as typed.** Surrounding whitespace and letter case are ignored by the contract. Only an empty (or whitespace-only) code
  is stopped before sending, because it is always rejected. Length and format are not checked here: the contract declares neither
- **An idempotency key goes with every claim.** A claim cannot be undone, and a claim sent again under another key yields another coupon
  within the limit. The key is renewed once a response settles the claim: a success, a rejected code, or a request the contract could
  not read (`400`). After a conflict (a claim still being processed under the same key), an unavailable service or a network failure,
  sending again reuses the same key, so a claim that did go through is not claimed twice. Until the outcome is known the code
  cannot be edited: the receiver answers a resend under the same key with the first claim's outcome, so a changed code would
  silently get the result of the code sent before
- On success the list is fetched again and the screen stays where it is

**When the response to a claim never arrived, check the list before claiming again.** Nothing is added to tell that case apart: the
row either appeared in the list or did not.

## Failures

| Where | What happens |
| --- | --- |
| Fetching the list | The route's boundary takes the whole screen, with a retry ([0080](../../../../../adr/0080-error-handling.md)) |
| Claim: the code is not accepted (`422`) | **One message, whatever the reason.** The contract does not distinguish them, because distinguishing would be a clue for guessing valid codes |
| Claim: a conflict (`409`) | Wait, then send again with the same key. The contract declares only a generic conflict; this follows the IETF Idempotency-Key draft (`draft-ietf-httpapi-idempotency-key-header` §2.7), which assigns `409` to a concurrent request with the same key and lets it be resent unchanged |
| Claim: the request could not be read (`400`, or the key is missing) | Reload the screen. Fixing the code would not help |
| Claim: unavailable or failed (`5xx`, network) | Shown beside the form; the input and the key are kept |
| Claim: the session expired (`401`) | Sent to login, returning to this screen |

## Authorization

Same as my page ([`../page.function.md`](../page.function.md#authorization)). An unauthenticated actor is sent to login, and
an unregistered actor to registration (`/onboarding`), both with an instruction to return to this screen.

## Related

- Implementation `src/features/coupons/` — [README](../../../../../../src/features/coupons/README.md)
- Entry point [`/mypage`](../page.function.md)
- The contract `GetUsersMeCoupons` / `PostCampaignsClaims` in `openapi/api.gen.yaml`

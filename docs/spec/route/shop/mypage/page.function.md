# `/mypage` My Page (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Fetching

Three lines (the user's own information, the purchase summary, and one page of purchase history) are fetched in parallel within the RSC. They do not
depend on one another, so there is no reason to wait for them in sequence.

| Content | Source |
| --- | --- |
| Profile | `GET /v1/users/me` |
| Purchase summary | `GET /v1/users/me/purchases/summary` |
| One page of purchase history | `GET /v1/purchases` |

**Partial failure is not allowed.** All of it is the user's own information, and a screen showing only one part conveys nothing beyond "something
is broken." Failure is received by the route's `error` boundary.

## Purchase Summary Details

The top 10 are shown in descending order of order date and time.

**Anything beyond 10 is sent to the purchase history (`/purchases`).** This is the place to check the breakdown of the summary, not the place to read
the history itself.

**There is no filtering by period.** The contract (`GET /v1/purchases`) accepts only the two cursors,
and applying a date condition on the client side to already-fetched pages would yield a list missing older purchases that match the condition.
Filtering by range is an operation the purchase history screen owns.

## Account Closure

- **It does not go through if even one purchase is in progress** (the contract returns `409`)
- When it succeeds, the session is discarded. If a destination that ends the IdP-side session is returned, the user is sent there first;
  if not (or if it cannot be assembled), the user is sent to the top page
- **Immediate reflection is not promised**. Cancellation and returning stock run with eventual consistency, so right afterwards they may not
  be reflected yet

## Authorization

- An unauthenticated actor is sent to login with an instruction to return to this screen
- An actor that is authenticated but not registered as a user is sent to registration (`/onboarding`) with an instruction to return to this screen

The decision is made before rendering the actor's information. Before the outer frame there is also a pre-check that only reads the cookie, but the line of defense is this screen's
decision ([0079](../../../../adr/0079-auth-frontend-seam.md) / [0043](../../../../adr/0043-middleware-policy.md)).

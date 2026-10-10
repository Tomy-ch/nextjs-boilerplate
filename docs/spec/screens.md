# Frontend Implementation Reference: Screen List and API Overview

A mapping of the EC sample's screens to its APIs. The sample's backend is go-boilerplate, and where it is fetched from is declared by [`openapi/sources.yaml`](../../openapi/sources.yaml).
For detailed types and error codes, the imported contract [`openapi/api.gen.yaml`](../../openapi/api.gen.yaml) is authoritative. This document is for grasping the mapping between screens and APIs and the implementation caveats. For authentication alone, the mock OIDC contract at `go-boilerplate/docker/mock-auth-server/openapi/openapi.gen.yaml` is authoritative.

- This document is **the sample's specification**
- The screens and features listed in this document are **in principle subject to the sample purge (demolition)**, and **this document itself disappears too**. For the **exceptions** (what remains in the core, such as the login screen) and the exact boundary, `SAMPLE_PATHS` in [`scripts/setup/remove-sample/sample-manifest.ts`](../../scripts/setup/remove-sample/sample-manifest.ts) is authoritative
- This document lists as used APIs only those that exist in the imported OpenAPI. **The frontend does not call APIs that are not in the OpenAPI**

---

## 0. Authentication and Common Matters (the Scope the Frontend Is Aware Of)

- Authentication is **brokered with mock OIDC by the Next.js BFF**. The browser holds only an httpOnly BFF Session Cookie, and JWTs (Access Token / ID Token) are never exposed to the browser
- The BFF obtains the endpoint / issuer through `GET /.well-known/openid-configuration` and the signing keys through `GET /.well-known/jwks.json`. These values are not hard-coded into screens or features
- For login, the BFF starts Authorization Code + PKCE S256 against `GET /oidc/authorize`, and on callback calls `POST /oidc/token` with `application/x-www-form-urlencoded`. The BFF holds and verifies `code_verifier`, `state` and `nonce`
- For logout, the BFF calls `POST /oidc/logout`. The IdP's logout is not a GET navigation, so the browser does not navigate to the IdP directly
- "APIs that require authentication", as seen from the frontend, are implemented on the assumption that the Bearer is attached automatically through the BFF. There is no need to assemble an Authorization header individually
- 401 is treated as "not logged in / session expired", and redirects to the login screen (U9, a BFF route)
- 403 is "logged in but insufficient permission". It occurs when a non-admin user accesses an admin screen (the A screens). In the UI, the basic approach is to show or hide the relevant button / path as a whole
- Currency: a product's `price` is a USD decimal string, and purchase totals are integer USD cents. Only when `displayCurrency=JPY` is specified explicitly is `referenceAmount` attached as a reference value. The frontend makes it explicit on screen that it is "for reference"
- The cart (U4) **is held by the backend** (`/v1/carts/me`). It works without logging in; the subject is `X-Cart-Session` for a guest and the Bearer when logged in, and when both are present the logged-in one wins. **Fetching re-evaluates each line**: lines that can no longer be bought or whose values changed get `issues`, and the subtotal is the sum (a reference value) of only the lines whose `issues` are empty. Carrying a guest cart over at login is triggered by the BFF in the callback ([ADR 0079](../adr/0079-auth-frontend-seam.md))
- Images are uploaded through `POST /v1/products/images` (multipart), and the object key the backend issues (`products/{uuid}.{ext}`) is stored. They are served from Garage's public endpoint, which is allowlisted in `remotePatterns` of `next/image`. **No wildcards**
- The product description is **rich text** (authored with TipTap). The display side always passes it through a sanitizer (using raw `dangerouslySetInnerHTML` directly is forbidden; see [docs/rules.md](../rules.md#security), "`dangerouslySetInnerHTML` is forbidden in principle")
- Pagination is basically **cursor-based**. Screens with infinite scroll (incremental fetching) and screens with page-by-page navigation coexist, so mind the implementation pattern of each screen
- The writes that require an Idempotency-Key are purchase creation (U6) and posting and replying to inquiries (U13 / A10). Neither has a natural key, and a resend made only because a response did not arrive becomes a second record, so implement it as double-submission prevention
- **The browser opens long-lived connections (SSE) to the backend directly**. This path is separate from the fetch relay; because `EventSource` cannot carry arbitrary headers, the credential is a short-lived ticket the BFF issues, carried in the query. Ordering, deduplication, reconnection and cut-off decisions are held by `adapters/client/stream`, and the screen only folds in the events it receives ([ADR 0074](../adr/0074-runtime-communication-seam.md))

---

## 1. Screen List (27)

### User Side (13)

| # | Screen | APIs used | Rough specification | Frontend implementation caveats |
| --- | --- | --- | --- | --- |
| U1 | Top | `GET /v1/products/ranking/quantity` / `GET /v1/products` (newest sort) / `GET /v1/products/categories` | A top page that just lines up the best-seller ranking, new products and category paths. No personalization | Categories come from an endpoint with `use cache`, so they go into the static shell, and the remaining two are fetched inside the RSC with `Promise.allSettled`. `all` stops waiting at the first failure, so the results of the parts that succeeded could not be used. Only the part that failed is replaced with a failure display |
| U2 | Product list | `GET /v1/products` (`after` / `first` / `categoryCodes` / `keyword` / `sort`) / `GET /v1/products/categories` | A list with search, filtering and sorting | Conditions go into `searchParams`, and the RSC refetches every time they change. On wide tiers filtering is applied immediately on selection in the sidebar; on narrow tiers it is confirmed all at once inside a sheet (sorting is immediate on both). Incremental fetching uses infinite scroll. No status filter is provided on the screen. `statusCodes` is accepted by both the contract and the backend and actually works, but the status master is the 10 inventory and sales statuses, which is the seller's vocabulary, and which of them to show buyers is undecided (whether a product is public is a separate axis, `publishedAt`, unrelated to the status master) |
| U3 | Product detail | `GET /v1/products/{productId}` / `GET /v1/products` (`categoryCodes`) | Displays a single product's detail. Related products reuse the list API with a category filter (no dedicated API) | The description is rich text, so it is always displayed through a sanitizer |
| U4 | Cart | `GET /v1/carts/me` / `PUT /v1/carts/me/items/{productId}` / `DELETE /v1/carts/me/items/{productId}` / `DELETE /v1/carts/me` | Adding products, changing quantities, removing, clearing | **Survives a reload**. Quantity is set (upsert), not added, and the natural key provides idempotency, so `Idempotency-Key` is not needed. Lines that can no longer be bought or whose values changed are shown on screen as `issues`. Entered from the secondary path "View cart" (`カートを見る`) in the cart sidebar / drawer. **Requires no authentication**, so it is the only route by which a user who is not logged in can check the contents on a full screen |
| U5 | Purchase confirmation | `GET /v1/carts/me` / `GET /v1/exchange-rates?base=USD&quote=JPY&amount=` / `GET /v1/users/me` | Final confirmation of the cart contents. JPY display can be toggled | Lines are not carried over from the client but **fetched again on this screen**. Because re-evaluation runs, lines that have become unbuyable or whose values changed since they were seen in U4 can appear here. The exchange API's `amount` is a decimal string. If fetching the exchange rate fails, the purchase itself can continue without the reference amount (degrade). Entered from the primary path "Proceed to checkout" (`購入手続きへ`) in the cart sidebar / drawer. It is behind authentication |
| U6 | Purchase complete | `POST /v1/purchases?displayCurrency=JPY` | Confirms the purchase. Sends `productId` and `quantity` in `details` | `Idempotency-Key` is optional in the OpenAPI, but the frontend always sets it. It prevents double clicks / reloads, and the submission state is managed with `ActionState<T>` |
| U7 | Purchase history | `GET /v1/purchases` (`after` / `first`) | A list of your own purchases | **Infinite scroll (incremental fetching)**. Pass the previous page's `nextCursor` as `after` |
| U8 | Purchase detail | `GET /v1/purchases/{purchaseCode}` / `PATCH /v1/purchases/{purchaseCode}/pay` / `PATCH /v1/purchases/{purchaseCode}/cancel` | The lines and product information of one purchase, and the operations available in its status | The lines include the current product name joined from products, and the `unitPrice` at the time of purchase. **Operations that cannot be performed are not shown, rather than made unpressable**. Availability is derived from the status's business key (`status.code`). A 409 is phrased as "not possible in the current status", with a path to reload |
| U9 | Login | BFF route → mock OIDC | Redirects to the IdP with **Authorization Code + PKCE S256** | Does not call the Go API at all. The frontend only navigates to the BFF's login URL, and the Route Handler takes care of Discovery / authorize / token |
| U10 | Registration (onboarding) | `GET /v1/prefectures` / `GET /v1/addresses?postalCode=` / `POST /v1/users` | Registering additional information (address etc.) after the first login | Implemented as explicit onboarding. `Idempotency-Key` is set on `POST /v1/users`, and if postal-code autocomplete returns `isFallback=true`, every field is entered by hand |
| U11 | My Page | `GET /v1/users/me` / `GET /v1/users/me/purchases/summary` | Viewing the profile, showing the purchase summary, a path to account closure | Account closure requires a confirmation modal (an irreversible operation) |
| U12 | User update | `GET /v1/users/me` / `GET /v1/prefectures` / `PUT /v1/users/{userId}` | Editing the profile | A route independent of U11. A worked example of **CollectAll** (side-by-side composition with `Promise.all` inside the RSC) |
| U13 | Inquiries | `GET /v1/inquiries/me/messages` / `POST /v1/inquiries/me/messages` / `POST /v1/inquiries/me/stream-ticket` / `GET /v1/streams/{destination}` | Conversation with support. One per user; the first post creates the inquiry | **The only screen where an arriving message appears without waiting for a refetch**. On initial display the RSC fetches the history, and the `streamCursor` its response returns is passed as the subscription's start position. The browser connects to the backend's SSE directly for the subscription, and the credential is a short-lived ticket the BFF issues, carried in the query. Sending is a Server Action + `Idempotency-Key`, and a sent message appears in the authoritative data fetched again, not through the subscription. With `APP_API_MODE=mock` the ticket fetch endpoint refuses to issue, and the screen stops in its form without a subscription (display and sending work) |

### Admin Side (10)

| # | Screen | APIs used | Rough specification | Frontend implementation caveats |
| --- | --- | --- | --- | --- |
| A1 | Dashboard | `GET /v1/dashboard/summary` | Number cards and horizontal bars broken down by status | The summary displays values **already composed on the backend** as is. The low-stock list (`GET /v1/products/low-stock`) is not used in A1 (it is an independent, separate feature with no screen) |
| A2 | Product list | `GET /v1/products` (`includeUnpublished=true`) / `GET /v1/products/statuses` | The admin operations list. Paths to create, edit and restock | Unpublished products are included in the population. Only an admin can pass the inclusion flag. Changing the population changes the first sort key to the registration date and time, so a pagination cursor is usable only within the same flag |
| A3 | Product restock | `PATCH /v1/products/{productId}/stock` | Only adding to / adjusting the stock quantity | `delta` is signed. On 409 refetch; on 503 retry after a while. Nothing other than stock is edited (that is A7's job) |
| A4 | Analytics | `GET /v1/dashboard/summary` / `GET /v1/products/ranking/quantity` | Displays sales and ranking aggregates | Uses the same API as A1 but from a different viewpoint. The period is sent as a half-open interval of instants `[orderedAfter, orderedBefore)`, and resolving calendar ranges (today, this month) is the screen's job. Best-sellers are fixed to the last 30 days and do not follow the period selection |
| A5 | User list | `GET /v1/users` (`page` / `perPage` / `active`) / `DELETE /v1/users/{userId}` | User list and account closure | Account closure requires a confirmation modal. A 409 is a refusal because purchases in progress remain, and asynchronous cancellation or stock restoration is not assumed |
| A6 | Product creation | `POST /v1/products` / `GET /v1/products/categories` / `GET /v1/products/statuses` / `POST /v1/products/images` | A form for registering a new product | The description uses TipTap. **Images use an upload UI**. `price` is a USD decimal string, and the `imagePath` from the image upload is passed to the creation API |
| A7 | Product editing | `GET /v1/products/{productId}` / `PATCH /v1/products/{productId}` / `POST /v1/products/images` | A form for editing an existing product | Always send the `version` that was loaded. On 409, show a reload path saying "someone else has already updated it". The stock quantity cannot be edited here (that is A3's job) |
| A8 | Shipping | `GET /v1/purchases/shippable` / `PATCH /v1/purchases/{purchaseCode}/ship` / `GET /v1/purchases` (`statusCodes=8` + `includeOtherUsers=true`) / `PATCH /v1/purchases/{purchaseCode}/deliver` | Lines up paid, unshipped orders by shipments that can be sent together, and ships them. Shipped orders are listed below, and each is marked delivered one at a time | The contract decides both how shipments are grouped and the order, so the screen does not reorder them. Shipping is one purchase at a time, so the grouped action sends the orders side by side in the same submission. A partially successful submission is not treated as a failure; both the number that went through and the number that did not are shown. No confirmation is inserted (it is assembly-line work). Delivery confirmation has no axis for grouping and is always one at a time — whether something arrived differs per order |
| A9 | Inquiry list | `GET /v1/inquiries` (`after` / `first`) / `POST /v1/inquiries/feed/stream-ticket` / `GET /v1/streams/{destination}` | Lists incoming inquiries by most recently updated. The body is not included | Subscribes to the update feed and refetches the list when something arrives. **Rows are not rewritten with what arrived** — the feed carries only "which inquiry has progressed how far", with neither the sort basis nor the other columns. Pagination is by cursor, and the URL remembers where to go back to |
| A10 | Responding to an inquiry | `GET /v1/inquiries/{inquiryId}/messages` / `POST /v1/inquiries/{inquiryId}/messages` / `POST /v1/inquiries/feed/stream-ticket` | Reads one conversation and replies | **The conversation itself cannot be subscribed to** — the contract's subscription endpoints are two, "your own inquiry" and "the update feed", and there is no endpoint through which operators subscribe to an arbitrary one directly. When the feed reports an update to the one that is open, the authoritative data is fetched again. Messages aligned to the right are the operator's, so "me" is swapped relative to the user side. The history does not return whose inquiry it is, so it is matched against the row in the list |

### Site Information and Development Screens (4)

These screens are outside the EC business flow. **Of the three static screens, only "About this site" carries the
subject (EC)**; the rest are explanations of the boilerplate and development surfaces, so `/dev/session` remains after the sample
is discarded.

| # | Screen | APIs used | Rough specification | Frontend implementation caveats |
| --- | --- | --- | --- | --- |
| S1 | About this site (`/about`) | — | What the site is for, what it is built with, what does not work | Has no fetching. Rendered statically |
| S2 | Privacy (`/privacy`) | — | Explains where entered information is kept, in three ways depending on how the site is running | Not stock wording. Written so users can tell which running configuration applies to them |
| S3 | Terms of use (`/terms`) | — | Consent to viewing, security risks, terms of provision, disclaimer | Only this screen holds the disclaimer. Not copied to S1 |
| D1 | Development session (`/dev/session`) | — (IdP endpoints only) | Issues a session without going through the IdP, and enters protected screens | The whole route is left out of the production build. The check for which environments may open it is applied to both the screen and the Server Action |

### Choosing a Composition Pattern (Implementation Guidance)

- **Backend composition (A1)**: the display involves domain computation (aggregation) → the backend returns an already composed response from one API. The frontend does not compute across multiple APIs
- **CollectAll (U12)**: multiple independent resources are simply placed side by side → they may be fetched in parallel and composed on the frontend side (inside the RSC)

---

## 2. API Overview

### Product APIs

| Method / Path | Auth | Purpose | Main fields the frontend sends | Main response fields | Main errors |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/products` | Not required (`includeUnpublished=true` requires admin) | List (cursor + filter + keyword + sort) | after, first, categoryCodes, statusCodes, keyword, sort, includeUnpublished | items[], nextCursor | 400, 401, 403 |
| `GET /v1/products/{productId}` | Not required | Detail | — | Product detail (including description) | 400, 404 |
| `GET /v1/products/categories` | Not required | Category master | — | categories[] | — |
| `GET /v1/products/statuses` | Not required | Status master | — | statuses[] | — |
| `GET /v1/products/ranking/quantity` | Not required | Best-seller ranking (by quantity) | orderedAfter, orderedBefore, limit | ranked items[] | 400 |
| `POST /v1/products` | Requires admin | Product creation (A6) | name, description (rich text), price (decimal string), categoryId, statusId, imagePath, quantity | The created product | 400, 401, 403, 422 |
| `PATCH /v1/products/{productId}` | Requires admin | Product update (A7). Fields other than stock | version and the partially updated fields | The updated product | 400, 401, 403, 404, **409 (optimistic locking)**, 422 |
| `PATCH /v1/products/{productId}/stock` | Requires admin | Restocking (A3) | delta | The updated product | 400, 401, 403, 404, **409**, 422, 503 |
| `POST /v1/products/images` | Requires admin | Image upload (A6 / A7) | The image binary as multipart | `{ imagePath }` | 400, 401, 403, 413, 415, 422 |

### Purchase APIs

| Method / Path | Auth | Purpose | Main fields the frontend sends | Main response fields | Main errors |
| --- | --- | --- | --- | --- | --- |
| `POST /v1/purchases` | Required | Purchase creation (U6) | details (productId, quantity), Idempotency-Key (header), displayCurrency (optional query) | The purchase, referenceAmount | 400, 401, 409 (insufficient stock etc.), 422 |
| `GET /v1/purchases` | Required (`includeOtherUsers=true` requires admin) | Purchase history (U7, cursor). The period is a half-open interval of instants | after, first, orderedAfter, orderedBefore, statusCodes, includeOtherUsers | items[], nextCursor | 400, 401, 403 |
| `GET /v1/purchases/{purchaseCode}` | Required | Purchase detail (U8) | — | Lines (product names already joined) | 401, 404 |
| `PATCH /v1/purchases/{purchaseCode}/cancel` | Required | Cancellation (U8) | — | The updated status | 400, 401, 404, 409 (invalid transition) |
| `PATCH /v1/purchases/{purchaseCode}/pay` | Required | Payment (simulated payment, U8). Only from unprocessed / accepted / under review | — | The updated status | 400, 401, 404, 409 (double payment, invalid transition) |
| `PATCH /v1/purchases/{purchaseCode}/ship` | Requires admin | Shipping (A8) | — | The updated status | 400, 401, 403, 404, 409 |
| `PATCH /v1/purchases/{purchaseCode}/deliver` | Requires admin | Delivery complete | — | The updated status | 400, 401, 403, 404, 409 |
| `GET /v1/purchases/shippable` | Requires admin | Groups for batched shipping (A8) | limit | `groups[]` (groups per purchaser) | 400, 401, 403 |

### Inquiries

| Method / Path | Auth | Purpose | Main request | Main response fields | Main errors |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/inquiries/me/messages` | Required | Your own history (U13) | afterSequence, first | messages[], streamCursor, nextAfterSequence | 400, 401 |
| `POST /v1/inquiries/me/messages` | Required | Your own post (U13) | body, Idempotency-Key (header) | The added message | 400, 401, 409, 422 |
| `POST /v1/inquiries/me/stream-ticket` | Required | Issuing a subscription ticket (U13) | — | ticket, streamId, expiresAt | 400, 401, 404 (no inquiry yet) |
| `GET /v1/inquiries` | Requires admin | List (A9, cursor) | after, first | items[], nextCursor | 400, 401, 403 |
| `GET /v1/inquiries/{inquiryId}/messages` | Requires admin | Any history (A10) | afterSequence, first | The same shape as your own history | 400, 401, 403, 404 |
| `POST /v1/inquiries/{inquiryId}/messages` | Requires admin | Reply (A10) | body, Idempotency-Key (header) | The added message | 400, 401, 403, 404, 422 |
| `POST /v1/inquiries/feed/stream-ticket` | Requires admin | Issuing an update-feed ticket (A9 / A10) | — | ticket, streamId, expiresAt | 400, 401, 403 |
| `GET /v1/streams/{destination}` | ticket (query) | The subscription itself (U13 / A9 / A10) | after (start position) | SSE. Business events and `event: control`, a 15-second heartbeat | 400, 401, 410 (outside the retention period), 503 |

**The raw ticket value appears only in this response.** It goes into a URL, so it is not put into text, logs or span attributes.
For 5 minutes after issue it can be reused for new connections, and an established connection is cut off at the maximum connection time.

### Aggregates and Stock

| Method / Path | Auth | Purpose | Main response fields |
| --- | --- | --- | --- |
| `GET /v1/users/me/purchases/summary` | Required | Your own purchase summary (U11) | Total amount, count, breakdown by status |
| `GET /v1/dashboard/summary` | Requires admin | Cross-cutting admin aggregates (A1 / A4) | period, from / to for a range, sales for the period, count by status, product count (composed on the backend) |

### Foundation and Cross-Cutting

| Method / Path | Auth | Purpose | Notes |
| --- | --- | --- | --- |
| `GET /v1/users/me` | Required | Resolving the authentication context | Basic information of the logged-in user |
| `GET /v1/prefectures` | Not required | Prefecture master | For the select in the registration / update forms |
| `GET /v1/addresses?postalCode=` | Not required | Postal code → address autocomplete | If isFallback=true, every field is entered by hand (degrade) |
| `GET /v1/exchange-rates` | Not required | Exchange rate (for the reference yen conversion) | base, quote and amount (decimal string) are required. An external outage is 503 |
| `POST /v1/users` | Required | First-time onboarding (U10) | Sends the Idempotency-Key and the user information. 409 is a conflict such as an existing user |
| `DELETE /v1/users/{userId}` | Requires admin (A5) or the user themself (U11) | Account closure | 409 if purchases are in progress. Cancellation and stock restoration are processed in the same transaction |

### Login / Logout (mock OIDC)

Not present in the Go API's OpenAPI. The BFF's Route Handler uses the following mock OIDC contract. The frontend uses only the BFF's URLs (for example `/api/auth/login` / `/api/auth/logout`) (the reason for brokering is in §0).

| Method / Path | What the BFF uses it for | Why the browser does not call it directly |
| --- | --- | --- |
| `GET /.well-known/openid-configuration` | Discovery of the issuer / endpoints | The authority for the settings is the IdP's public metadata; it is not fixed in a feature |
| `GET /.well-known/jwks.json` | Obtaining the ID Token's signing keys | JWT verification is the BFF's responsibility |
| `GET /oidc/authorize` | Starting Authorization Code + PKCE S256 | The BFF generates and verifies state, nonce and code_challenge |
| `POST /oidc/token` | Token exchange after the callback | The code_verifier and tokens are not exposed to the browser |
| `GET /oidc/userinfo` | Obtaining the needed claims | Keeps the access token inside the BFF |
| `POST /oidc/logout` | RP-Initiated Logout | The IdP logout is a form POST, not a GET |

`/bypass/token` and `/bypass/session` are test helpers limited to the mock's dev-gate, and are not used for the normal login path.

---

## 3. Exclusions (What the Frontend Does Not Need to Build)

- The payment SDK itself and PSP integration (the pay operation completes with only the Go side's state transition; simulated payment)
- Recommendation and personalization features
- Rich-text editing screens other than the product description
- Time-series charts (limited to number cards and horizontal bars broken down by status)
- i18n switching, DnD, feature flag UI

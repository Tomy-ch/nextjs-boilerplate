---
imports-allowed: [errors] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [fetch, config, business-logic]
test-requirement: unit
coverage-exclusions:
  - "src/model/generated/design-token.ts"
---

# model

The pure kernel that holds display Value Objects, formatters, unit conversion, display validation, and display result types.

## What Belongs Here

- Display values, conversions and validation rules referenced from multiple places
- Presentation-layer result types such as `ActionState<T>`
- **Values a screen creates to decide the unit of a submission.** The idempotency key that identifies one submission is one of these: the value itself
  is protocol vocabulary, but **what decides when to renew it is the screen** (reopening means a different submission),
  so it lives here rather than in `adapters`

## What Does Not Belong Here

- Business rules owned by the backend, fetch, config, leakage of external types

## Modules

| Module | Role |
| --- | --- |
| [`rich-text/`](rich-text/README.md) | The rich text sanitize port. Converts an HTML string into a tree limited to what may be displayed |
| `breakpoint.ts` | Builds media queries for widths that have not reached a tier. The widths are owned by design tokens |
| `datetime.ts` | Locale-aware formatters for dates, times and month names |
| `number.ts` | Locale-aware number formatting (digit grouping). Money is owned by `money.ts` |
| `locale.ts` | The default locale and default time zone. The single replacement point formatters use when omitted |
| `generated/breakpoint.ts` | Tier names and widths. Generated from `tokens/` (do not edit by hand) |
| `generated/design-token.ts` | Names of semantic tokens and raw scales. Generated from `tokens/` (do not edit by hand) |
| `media.ts` | Builds display URLs from object keys of the delivery platform |
| `pagination.ts` | Types representing one page for cursor-based and offset-based paging, plus appending for incremental fetching and conversion to page numbers |
| `action-state.ts` | The container for the result a Server Action returns to the screen. Field errors, form errors, success value |
| `search-params.ts` | Rules that turn how many times the same URL key appears into a value's meaning. Used together with zod schemas |
| `idempotency-key.ts` | The key that identifies one change, and the name of the form field that carries it |
| `uuid.ts` | Unique values a screen creates. RFC 9562 version 7, creatable even from sources that are not a secure context |
| `consent.ts` | The intent on whether cookies may be used for optional purposes, and the gate predicates per category |
| `money.ts` | Formats an amount held as an integer in the minor unit into locale-appropriate currency notation |
| `session.ts` | The identity and roles of an authenticated user. The payload placed in the cookie is confined to this type and holds neither the Access Token nor PII |
| `authz.ts` | The roles allowed per route prefix. Routes that require only authentication are expressed by listing every role |
| `return-url.ts` | A return destination that passed validation. Only same-origin relative paths pass; anything else falls back to the default destination |
| `cross-origin.ts` | Judging a request's origin, and building CORS / preflight response headers |
| `time-window.ts` | The period that aggregation and filtering target. Maps a calendar division to a half-open interval of instants in the reference time zone |
| `cart/` | Display types for the cart the sample screens handle, and how conditions raised on line items are shown <!-- sample:line --> |
| `dashboard/dashboard.ts` | Display types for the admin-side cross-cutting aggregates the sample screens handle <!-- sample:line --> |
| `inquiry/` | Display types for the inquiries the sample screens handle, and folding in what arrived through the subscription <!-- sample:line --> |
| `product/product.ts` | Display types for the products the sample screens handle <!-- sample:line --> |
| `purchase/purchase.ts` | Display types for the purchase history the sample screens handle <!-- sample:line --> |
| `purchase/purchase-status.ts` | Business keys for the purchase statuses the sample screens handle. Branching uses these values <!-- sample:line --> |
| `user/` | Display types for the users the sample screens handle, and display validation of profile input <!-- sample:line --> |

## How Display Types Are Shaped

Why display types are kept separately instead of copying the contract's wire types is owned by [0070](../../docs/adr/0070-backend-role-separation.md) and
[0029](../../docs/adr/0029-type-design-discipline.md). What sits here is the discipline of **how to cut** those types.

- **Types are split per reading party and per fetch endpoint.** Even for the same subject, a list row, a detail and an aggregate result
  receive different values from their fetch endpoints, and merging them into one type leaves "fields that are always missing on this screen". So that the
  receiving side does not have to check each time which fields are present, types are cut per endpoint.
- **Even with the same shape, a different reason to change means a different name.** Merging two things into one type merely because the contract
  happens to align them — like the category master and the status master — lets one side's needs move the other's declaration.
- **Types that cross JSON are built only from plain values.** The result types crossing the `useActionState` boundary and the list rows
  accumulated on the client by incremental fetching are such types; neither `Date` nor `undefined` nor `Error` survives the round trip. Dates and times stay as
  ISO strings, and absent values are held as `null`. The purpose is to show by type that the value survives the round trip; types that do not cross
  (details used only inside RSC) may hold a `Date`.
- **A derivable value gets no second source.** Whether there is a next page is whether `nextCursor` is `null`,
  with no boolean alongside. Whether something has ended is derived from its end time, whether a field is required by passing an empty string through the schema,
  and the list of protected routes from the declaration. Holding two lets implementations that look at only one and implementations that look at both coexist,
  and when they disagree there is no deciding which is right.
- **States are split only when what the screen says changes.** "Not read yet" and "read but not
  selected" (whether asking is allowed is reversed), and "no matches" and "the mechanism is not running" (whether fixing it fills the gap
  differs) are split. "The subject cannot be looked up" and "the subject has no images" are both, from the user's view,
  "no picture to show", so they fold into a single `null`. Split states are expressed as discriminated unions
  ([0029](../../docs/adr/0029-type-design-discipline.md)).
- **Amounts are held in the form the contract returns.** Amounts that arrive as decimal strings stay strings
  ([`docs/rules.md`](../../docs/rules.md#formatting)), totals that arrive as integers in the minor unit stay integers, and
  conversion back to the major unit happens only right before display, through `formatMoney`. A value converted to another currency is held together with the rate and the reference date
  — an estimate is no reference unless it is known which day's rates it is based on.
- **Categories are judged by business key, not by name.** Names are display text and are rewritten for
  backend-side reasons ([`docs/rules.md`](../../docs/rules.md#fetching)). Business key numbers do not mean an order of
  reaching, so whether a transition is possible is not judged by comparing their magnitude.
- **Judgments the backend has already made are only received as results, not re-judged here.** Whether a subject can be operated on,
  how aggregates are composed, and business thresholds are all decided by the backend; what sits here goes only as far as the minimal functions that
  map results to wording or display emphasis.

## Identifiers

The decision to make externally sourced identifiers branded types is owned by [0029](../../docs/adr/0029-type-design-discipline.md).
The shape in this layer is as follows.

- `<subject>IdSchema = z.string().brand<"<subject>">()`, `type <Subject>Id = z.infer<typeof …>`, and
  `to<Subject>Id(value: string): <Subject>Id` form one set of three.
- **Only boundaries may call `to<Subject>Id`.** A value passes through it once at the validation exit of `adapters`, at form intake, or at a
  route's dynamic segment, and the inside carries the established type. Existence is not checked
  — the backend is what knows identifiers, and a fetch returns a nonexistent value as `not-found`.
- **The schema itself is exported only when there is a caller that combines it inside a generated schema.**
  Subjects without one expose only the conversion function. Providing two entry points would make it possible to establish the type outside the boundary
  as well.
- A brand is a type-only marker; a value that crossed JSON stays a plain string. A single test
  pins this.
- Whether a schema is written with `zod` or `zod/mini` depends on whether it reaches the browser
  ([0029](../../docs/adr/0029-type-design-discipline.md)). `model` is also imported from client-side layers,
  so schemas that may be imported as values are written with `zod/mini`. An `import type` that pulls only types
  does not land in the bundle, and if it does, `scripts/client-schema-weight.gate.test.ts` fails.
  Building blocks the caller assembles with `zod` chains (`.catch()` / `.optional()`) (`search-params.ts`)
  are written with `zod` because their readers are confined to the server. The same gate fails the moment one is imported from the client.

## Display Validation Schemas

Why they are hand-written and the two-layer separation are owned by [0062](../../docs/adr/0062-form-input-validation.md), and the grammatical subject of messages by
[`docs/rules.md`](../../docs/rules.md#forms). Two points are added here.

- **Limits follow the contract's update request side.** The response side sometimes declares a looser limit, but there is no reason
  to let users enter a length that would be rejected when sent.
- **Requiredness is not enumerated.** One function decides it by passing an empty string through the schema, giving the marker and the validation
  a single source. Enumerating it makes it possible to loosen a rule while the screen still shows the field as required.

## Formatters and Time

The decision to display with `Intl` and to put the default locale in a single seam is owned by [0120](../../docs/adr/0120-locale-aware-formatting.md).
The shape for adding one more formatter is as follows.

- **The locale is received as the last argument, and `DEFAULT_LOCALE` is used when omitted.** The time zone is
  fixed to `DEFAULT_TIME_ZONE` — leaving it to the runtime would make a string rendered on the server (often UTC) and
  one rendered in the browser (the viewer's location) differ by the place of execution.
- **`Intl.*` instances are created only once per combination of locale and granularity (or currency), and reused through a module-level `Map`.**
  Why they are reused is owned by [`docs/rules.md`](../../docs/rules.md#formatting).
- **Decimal places per currency are derived from `Intl`'s `resolvedOptions()`.** Keeping the mapping between currency and digits in a local table
  would mean aligning two places every time another currency is handled.
- **Being a reference value is not mixed into the format.** Putting "approx." or a note into the format would split the forms readable as an amount
  in two. The screen indicates it through placement and accompanying text.
- **Whether two moments fall on the same day is judged by formatted date strings.** That is the value rounded in the fixed time zone;
  creating a `Date` with the time dropped and comparing would have the rounding side and the displaying side handle time zones
  separately.
- **The time a judgment is based on is received as an argument.** Functions that resolve "today" or "has it expired" take `now`,
  and this layer does not read the clock. Callers pass it from `config/clock`.
- **Calendar boundaries are resolved into calendar days with `Intl` (with `timeZone` specified), and carrying over is done on `Date.UTC`.**
  The offset as of that day is looked up from `Intl` rather than written as a fixed string — so that when `DEFAULT_TIME_ZONE` is changed
  to a region with daylight saving time, the offset does not alone stay stale. An unreadable calendar specification
  throws instead of falling back to the default — because for a user who rewrote the URL by hand, it would assemble an interval nobody
  intended.

## Judging URLs and Origins

- **Judge by the result the URL parser resolves, not by how the string looks.** In `/\t/evil.com` the tab is removed during parsing,
  turning it into a protocol-relative URL that slips past a check on the first two characters. What is actually used
  is the resolved form, so the check is made against that form too. Whether something falls under the delivery origin is also checked by a prefix match on the `href`
  resolved after holding the delivery origin as a URL — comparing raw strings applies normalization of host case and the default port
  to one side only.
- **A base origin used only to check where something resolves uses the reserved TLD `.invalid` (RFC 6761).** Borrowing a real
  name would change the judgment if that name later takes on another meaning.
- **A value that fails the judgment falls to the safe side.** A return destination to the default destination, a delivery URL to `null`, an unknown
  consent spelling to "not selected", an unreadable `Origin` to untrusted. Not treating unreadable values as intent or destination
  is the safe side this layer is responsible for.
- Same-origin judgment uses only the host and does not compare the scheme — behind a reverse proxy that terminates TLS,
  `Origin` arrives as https even when the request this side sees is http.

## Adding a Subject Module

Types specific to a subject are grouped under `model/<subject>/` and not mixed with cross-cutting modules. What one subject holds
is aligned to the following shape.

| File | Contents |
| --- | --- |
| `<subject>/<subject>.ts` | Identifiers (the set of three in "Identifiers" above), display types per reading party, aliases of `CursorPage<…>` / `OffsetPage<…>` |
| `<subject>/<input>-schema.ts` | Display validation of that subject's input ("Display Validation Schemas" above) |
| `<subject>/<concern>.ts` | Minimal display functions, such as mapping judgment results to wording, or folding what arrived through the subscription into the authoritative copy |
| `<subject>/<status>.ts` | The vocabulary of business keys used for branching |

References across subjects are limited to identifier types (`import type`). While a subject module is used by only one feature,
it stays inside that feature, and is raised here once it is referenced from several
([0021](../../docs/adr/0021-frontend-responsibility.md), its acceptance criteria for kernels).

## What to Change When Adopting

**`ROUTE_POLICIES` in `authz.ts` is a place to show where and how protected routes are declared.**
The remaining declarations are one that requires only authentication and one that also requires a role, and **two that require different roles
are kept to verify that the mechanism works** (with only one, no input could reach the branch that rejects a party
lacking the role). Rewrite them to the routes you protect.

| What | Default | Where to change |
| --- | --- | --- |
| Protected routes and roles | One declaration requiring only authentication and one also requiring a role | `ROUTE_POLICIES` in `authz.ts` |
| Role vocabulary | Owned by `session.ts` | To the roles your IdP passes |
| Default locale and time zone | `ja-JP` / `Asia/Tokyo` | `DEFAULT_LOCALE` / `DEFAULT_TIME_ZONE` in `locale.ts` |
| Currency used as the basis for storage and display | `USD` | `BASE_CURRENCY` in `money.ts` |

**What is enumerated is the protected side, not the public side.** Prefixes cannot be nested, and `/` cannot be used
(it would match every path, the login route itself would become protected, and navigation would loop). The reason is held by
the doc comment of `ROUTE_POLICIES`.

The two files in `generated/` are generated artifacts from `tokens/` and are not fixed by hand ([`tokens/README.md`](../../tokens/README.md#what-to-change-when-adopting)).

## Operations

- The only dependency is `errors`
- File names are kebab-case, type names PascalCase, function names camelCase
- A value set is one pair of an `as const` object and a `(typeof X)[keyof typeof X]` type, and each judging side decides how to handle unknown values
- Tests involving time zones take as fixed values the instants where the calendar day differs between UTC and the reference time zone. Behavior in another time zone is verified by replacing `DEFAULT_TIME_ZONE` with `vi.doMock("./locale")`
- Logic that chooses a source (such as a context without `crypto.randomUUID`) is verified by creating that context with `vi.stubGlobal`

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: fetch` — holds no external IO such as `fetch` | violation. Imports of `adapters` and building subscriptions (`EventSource` / `WebSocket`) are failed by machines, so what is checked here is calls to the global `fetch` | [0021](../../docs/adr/0021-frontend-responsibility.md), what it assigns to each kernel. Machine: ESLint boundaries and `no-restricted-syntax` (`eslint.config.ts`) |
| `forbidden: config` — does not import `config` and does not read `process.env`. Configuration values that are needed are received as arguments | violation | The dependency matrix of [0021](../../docs/adr/0021-frontend-responsibility.md). Machine: ESLint boundaries and `NODE_RUNTIME_ACCESS` in `architecture.ts` |
| `forbidden: business-logic` — holds no business rules owned by the backend. What sits here goes only as far as types and minimal display functions | violation if it computes and outputs values the contract does not return. suggestion when a minimal function cannot be told apart from judgment logic | The prohibitions in [0029](../../docs/adr/0029-type-design-discipline.md) / the prohibitions in [0070](../../docs/adr/0070-backend-role-separation.md) / [0021](../../docs/adr/0021-frontend-responsibility.md), the fourth of its acceptance criteria for kernels |
| Does not copy the backend contract into hand-written types. What sits here are display types, and conversion to and from the contract's shape is owned by `adapters` | suggestion (cannot be told apart from a display type that happens to have the same shape) | The prohibitions in [0070](../../docs/adr/0070-backend-role-separation.md) / this README, "What Does Not Belong Here" |
| What is placed here is referenced from multiple places. Something used by only one feature goes inside that feature | suggestion if there is only one reference | [0021](../../docs/adr/0021-frontend-responsibility.md), the first and second of its acceptance criteria for kernels / this README, "What Belongs Here" |
| Type design discipline readable from the shape of types — do not express states that cannot hold at once as a set of booleans, do not carry `unknown` into inner layers but check it once at the boundary (a boundary function taking `unknown` and establishing it is exactly that shape), do not expose externally sourced identifiers as a plain `string` | suggestion | The type design decisions and prohibitions of [0029](../../docs/adr/0029-type-design-discipline.md) |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. The basis for this kernel importing only `errors`
- [0029](../../docs/adr/0029-type-design-discipline.md) — Type design with discriminated unions, branded ids and parsing once at the boundary, and how to choose a zod flavor
- [0031](../../docs/adr/0031-policy-state-supply.md) — The shape of supplying policy state such as consent
- [0045](../../docs/adr/0045-fonts-and-images.md) — The image delivery origin, and built URLs not leaving it
- [0061](../../docs/adr/0061-form-mutation-ux.md) — The container for the result a Server Action returns to the screen (`ActionState`)
- [0062](../../docs/adr/0062-form-input-validation.md) — Input validation for display, and the line that keeps generated schemas out
- [0063](../../docs/adr/0063-mutation-result-notification.md) — Choosing how results are notified (inline / toast / redirect)
- [0070](../../docs/adr/0070-backend-role-separation.md) — The division where the backend owns business rules and this kernel holds only display types
- [0073](../../docs/adr/0073-pagination-fetch-boundary.md) — The fetch boundaries for cursor-based and offset-based paging
- [0079](../../docs/adr/0079-auth-frontend-seam.md) — The front side's share of session contents, return destinations and authorization decisions
- [0120](../../docs/adr/0120-locale-aware-formatting.md) — Locale-dependent formatting, and pinning date arithmetic to a time zone
- [0131](../../docs/adr/0131-cookie-consent.md) — The decision not to adopt consent management, and the categories and expiry kept regardless

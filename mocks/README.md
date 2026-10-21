---
test-requirement: unit
# sample:begin
coverage-exclusions:
  - "mocks/api/**"
# sample:end
---

# Contract-Driven Mocks

This is where the MSW handlers that `make api-gen` generates from the contract live. **They are never edited by hand.**
The place exists to keep one direction — when the contract changes, the mocks change automatically —
and adding a hand-written mock makes the contract and the mocks start moving separately.

It sits outside `src/` per the rule in [0027](../docs/adr/0027-directory-structure.md).

The `/api/*` handlers the catalog (Storybook) answers itself do not live here. What those return is not
a backend response but a display shape assembled by a Route Handler, which cannot be generated from the contract
([0054](../docs/adr/0054-ui-catalog-storybook.md)). They live in `.storybook/msw/`.

## Test Responsibilities

The frontmatter `test-requirement: unit` applies to the decisions the mechanism owns — the order of the handlers, and
the assembly that makes the same request return the same response ([0090](../docs/adr/0090-testing-strategy.md)).
The generated artifacts themselves are outside the test denominator; their correctness is guaranteed by regenerating from the contract.

**The wiring side (`handlers.ts`) has tests too.** What they check is not the correctness of the rules but
**whether the collisions the rules guard against actually exist in the real contract**. The mechanism side checks the rules with synthesised endpoints, so
it cannot notice when the contract no longer has a `/x/latest` and `/x/:id` pair.

The mechanism tests are built from a synthesised module that copies only the shape of the generated artifacts — lining up `get<Name>MockHandler`
and `get<Name>ResponseMock`, which take a per-endpoint response override, with asynchronous resolvers. Reading the generated artifacts themselves
would make these tests move every time the contract changes. The wiring tests, conversely, read the generated artifacts by name, and reconcile the set the generated artifacts
bundle and export at the end (`get<Title>Mock()`) against the set of endpoints, checking that nothing is dropped or added.

When testing the order, take positions **with a lookup that fails if the endpoint is not found**. Using `findIndex`'s `-1`
directly in a comparison makes a misspelled endpoint always "come first", and the test passes without checking any of the order.
Colliding pairs arise only at **the same depth**, because one parameter segment absorbs only one path segment.
Those are the pairs the wiring tests name.

**Using `setupServer` and `fetch` does not make it `integration`.** In the per-layer responsibility table, `integration`
refers to the HTTP boundary of the `adapters` API clients and Route Handlers, and what it checks is types and shapes against
the contract ([0090](../docs/adr/0090-testing-strategy.md)). What is checked here is **the determinism of the assembly** — whether a handler returns the same response
to the same request — and `setupServer` just happens to be the only way to drive it from outside.
It is the same reason a hook checked through RTL is still `unit`.

## Structure

| Path | Contents |
| --- | --- |
| `api/endpoints.msw.ts` | MSW handlers for the main API. Responses are assembled with faker |
| `api/endpoints.ts` | The HTTP client orval generates. **Not used** (below) |
| `handlers.ts` | Per-contract wiring. Holds only which generated artifacts to pass through and the reference table |
| `stable-responses.ts` | The assembly mechanism. Makes the same request return the same response, decides the order, and reconciles references across endpoints (below) |
| `references.ts` | The table of which field points at which endpoint. It is per-contract knowledge, so it is kept separate from the mechanism <!-- sample:line --> |
| `absent.ts` | An endpoint that returns 404 to requests carrying reserved identifiers. Reaches the "not found" state that a set answering every identifier cannot reach |
| `node.ts` | Node-side interception. Fetches from Server Components go through here too |
| `serve.ts` | Stands the same handlers up as an HTTP endpoint. For when they need to be reachable across processes (below) |
| `contract-conformance.test.ts` | Validates every handler's response against the corresponding zod. Consistency between generator declarations is also checked here <!-- sample:line --> |

<!-- sample:replace-begin -->
**What can only be written per contract is `handlers.ts`, `references.ts`, and the contract-conformance test.**
They read the generated artifacts by name, so they are rewritten when the contract changes. The rest is contract-independent mechanism.
<!-- sample:replace-with -->
<!-- = **Once a contract is in, what you write is one line in `handlers.ts`, the reference table, and the contract-conformance test.** All of them -->
<!-- = read the generated artifacts by name, so they cannot be written while there is no contract. The rest is contract-independent mechanism. -->
<!-- sample:replace-end -->

Only `mocks/<contract-name>/` is generated. The files directly under this directory are hand-written and stay subject to the linter.

**Only mechanism may be placed here by hand.** If it derives its set of endpoints from the contract's set, holds no body, and carries
only statuses whose meaning HTTP itself defines or a matching order, it cannot disagree with the mocks even when the contract changes
(`absent.ts` has this shape). The moment you assemble a body by hand, you are copying by hand the shape the contract declares, and that is
a hand-written mock.

## Startup

When `APP_API_MODE=mock`, `src/instrumentation.ts` starts Node-side interception after Config is settled.
Tests use the same handlers through `vitest.setup.msw.ts`. With separate stubs for the dev server and for tests,
the tests alone would keep passing on the old shape when the contract changes.

**Only the build needs an HTTP endpoint.** Interception works only inside the process that started it, and `next build`'s
prerendering runs in separate worker processes (we confirmed by measurement that neither `src/instrumentation.ts` nor `next.config.ts`
reaches them). Fetches with `use cache` are evaluated at build time
([0071](../docs/adr/0071-bff-api-integration.md)), so in mock mode `pnpm build`
starts [`serve.ts`](serve.ts) at the `APP_API_BASE_URL` endpoint before running `next build`.

**Responses are produced by interception.** `serve.ts` only passes the incoming request straight to `fetch`, and MSW
catches it before it reaches the socket. The handlers are not held twice, so the response seen over HTTP and the in-process response
cannot disagree.

**Interception is started not by the endpoint but by its caller.** Starting it inside the endpoint would make it uncallable from a context where it is already started
(the tests' `vitest.setup.msw.ts`) — MSW throws on a second `listen()`. The caller starts it with
`onUnhandledRequest: "error"`. Falling through to passthrough would turn an uncaught request back toward the endpoint itself in
a loop. The endpoint never rewrites the status — even a 500 from a failing handler flows through as the returned status, and
it returns 502 only for a request line it cannot rebuild as the endpoint's destination. If the relay decided the status, you could no longer read what happened
beyond the endpoint. The incoming `host` is not carried to the relay target. It is the name of where the request arrived, not of the relay target,
and carrying it would double the destination.

**The endpoint is started only in mock mode.** live points at the real fetch target, so intercepting there would
freeze a build that believes it is connected to the real thing on the generated responses.

**On the test side, interception is started only by the files that load it.** Applying it to every file costs about 480ms per
file, making Vitest's setup longer than the tests themselves. The files that load it are limited to those with an HTTP boundary
— the `adapters` API clients and Route Handlers —
([0090](../docs/adr/0090-testing-strategy.md)).

**The mock app is not a separate application.** The mock app is the same application started with `APP_API_MODE=mock`,
and it adds no deliverable. That the build passes without a backend and that it starts and returns responses is checked by
[`smoke.yaml`](../.github/workflows/smoke.yaml) (`APP_ENV=ci` = mock mode),
and verification through the screens ([e2e](../e2e/README.md)) also rests on this form.

**It is not published.** What is published is Storybook and the portal, both of which are this repository's
documentation. The mock app is a foundation for verification, not something that explains anything to a reader.
Publishing it would make it look like a demo, while its contents are values generated from the contract, and something nobody is responsible for updating would stay up permanently.
Tip it toward publishing **when the mock app itself takes on the role of showing a reader something** (for example, when it is decided to use it as a surface
for showing screen specifications).

Imports from `src/` into `mocks/` are forbidden by the boundary check. The only exception is the boot boundary
(`src/instrumentation*`), because starting the mock is its job.

## The same request gets the same response

The generated artifacts assemble responses with faker. faker without a seed returns different values on every call, so as-is,
**hitting the same URL twice changes both the contents and the count**. That is wrong as backend behaviour; the real thing returns the same thing
unless something was written.

So the "response override" the generated artifacts accept is given **a function that seeds and then returns the generated artifact's response**
(`stable-responses.ts`). The response shape stays the generated one, and nothing is assembled by hand.

The seed is determined by **method, URL and body**. The body is included because a create and an update with the same URL but different
bodies are different resources. Ignoring the body would return the same ID for two creates with different contents.

The URL includes the query string. If lists with different filters had the same contents, a state where the condition has no effect anywhere
could not be detected. Conversely, things that change on every run — time, random numbers, the order requests arrive in — are
not mixed in. The moment they are, the premise that the same tree produces the same picture is gone.

**A seed alone does not freeze dates.** faker's date generation swings back and forth from "now", and the seed decides
only the amplitude. If the reference stays at the run time, dates and times move by however much the capture time shifted, even for the same request.
Only by also setting the reference time to a fixed value right after seeding (`faker.setDefaultRefDate`) does
the same tree produce the same picture.

The pairing between endpoints and responses is decided by the generated names (`get<Name>MockHandler` ↔ `get<Name>ResponseMock`).
The mechanism scans the generated module's exports by this spelling, and an endpoint with no response body (one returning 204)
has nothing to override, so it is used as generated. If the generator's version moves and the spelling changes, the override no longer applies,
and responses fall back to raw randomness.

This must be the place where the seed is given per request. Giving it before the handler (in another handler or in
`request:start`) would interleave execution across requests because the generated resolvers are asynchronous,
and B's response would be assembled with A's seed. Inside the override is the same synchronous section as the resolver. For the same reason,
reading the body (asynchronous) is finished before seeding.

**The order is decided by the assembly side too.** Not by the order written in the contract. MSW matches in registration order, so
the order is decided by matching correctness, not by the caller's convenience. There are two rules.

1. **More specific paths first.** If `/x/:id` comes before `/x/latest`, requests to the latter are swallowed by the former and a different
   response comes back
2. **Equal specificity is ordered by generator function name.** The keys of the module that `import * as` returns are enumerated in sorted order
   by specification, and whether they look like declaration order depends on whether it is read as plain ESM or through a bundler's transform.
   Relying on declaration order lets you create "an order that passes in tests but differs at runtime"

Specificity is measured by **the number of parameter segments**. Not two levels of present or absent — with three levels such as `/x` / `/x/:id` /
`/x/:id/:subId`, an implementation that splits on presence puts the lower two in the same group, and with name order
the deeper one stays first. The two rules depend on each other. Name order is fixed at the start, and it survives within equal specificity
by relying on the final specificity sort being **stable**. Replace either with an unstable sort and the order within equal
specificity changes per loading path, swapping only what gets matched even though the contract is the same.

**Both live on the mechanism side, not in `handlers.ts`.** That file is rewritten per contract, so
putting the sorting there would mean copying the rules every time the contract is swapped.

No mechanism for judging regressions can rest on mocks that do not reproduce. Screen baseline images would come out as a different picture on every capture
([e2e](../e2e/README.md)), and E2E could no longer check displayed contents by name.

## Value ranges the contract cannot express are named in configuration

The generator knows only what the contract declares. Seeing `maxLength: 255`, it returns random Latin letters of up to 255 characters;
seeing an integer without bounds, it returns 16 digits. **Both conform to the contract, but the screens cannot be
checked with those values.**

- A name column monopolises the table's width, pushing the table's other columns outside the rendered area
- An aggregate figure does not fit in its card, and its end is always cut off
- A business key is outside its value range, so not a single look that branches on it ever appears

None of these looks like "the screen is broken". **That part simply does not appear in the picture**, so retaking the baseline images
does not reveal it. Value ranges are named with `override.mock` in `orval.config.ts`. The ranges written there are
not values readable from the contract; they exist only to give a shape that could really occur.

There are three units of naming, and they differ in reach.

| Unit | Where to write it | When to use |
| --- | --- | --- |
| Field name | `override.mock.properties`. The key is a regular expression in a string; the value is a function returning that field's value | When a field of the same name means the same thing at every endpoint. **Takes effect across endpoints** |
| A field of one endpoint | `override.operations.<Operation>.mock.properties` | When the same field name is declared with a different type or unit depending on the endpoint. Naming it by field name would make one of them violate the contract |
| The response of one endpoint | `override.operations.<Operation>.mock.data` | When the field names are generic (such as `name`), as in a master list, and naming by field would drag in other endpoints, or when the count or code system is not in the contract and the only option is to decide the whole response |

**Fields with a fixed magnitude ordering are not drawn independently from the same range.** A pair like a part and a total is drawn
separately per field, so giving them a common range makes the part exceed the total. Cut separate ranges, or decide the response
per endpoint.

The values written here do not come from the backend. This declaration is the only guarantee that they match real data.
When two declarations point at each other (when a name one endpoint returns must be a spelling present in another endpoint's list),
that match is enforced by the contract-conformance test (below).

**Values decided as a set cannot be expressed by naming.** The generator builds fields one at a time, so a set that must
line up, such as `id`, a business key and a name, is drawn separately (specifying the object itself has no effect). Sets are
replaced by the per-contract reference table after the response is assembled (below).

## Fields that point at each other across endpoints are reconciled before returning

The generated artifacts assemble responses **independently per endpoint**. As-is, combinations arise where an identifier one endpoint returns does not
exist in the response of the endpoint that lists it. A screen treats a value absent from its options as "a value that cannot be selected is filled in",
so that state would become the default appearance.

So, **after** the response is assembled, only the reference fields are re-taken from the response of the referenced endpoint. The referenced
response is also a pure function of the seed, so giving it the same seed as a request reaching that endpoint yields the same list the screen
actually receives. Reproducibility is preserved.

**The mechanism holds no table.** Which field points at which endpoint is per-contract knowledge, and the caller of `stableHandlers`
passes it (`handlers.ts`). If a field the table points at has disappeared from the contract, it fails — silently losing
consistency would bring back screens filled with values absent from their options.

When fetching the referenced response, its URL is built **from the same origin as the request being assembled**. Using a fixed origin
copied in by hand would give only the referenced side a different seed in an environment where the serving origin changed, and consistency would silently break. The paths the table passes
are the same spelling the screens actually hit — because the seed is determined by the URL.

The table has a fixed way of being written.

- **Register the same reconciliation function for endpoints that return the same shape.** List rows, detail, create, update and state-transition responses
  return the same resource shape, so write one per resource and list in the table the names of every endpoint that returns it. Touch only the fields
  the response has; do not add fields it lacks (such as child arrays absent from list rows)
- **Which item to pick is decided from the identifier currently in that field.** It lands on the same result per request,
  and each resource gets a different pick. Elements of a child array under one parent are offset by position —
  picking by identifier alone would line up the same pick under one parent several times
- **Per-master breakdowns cut the row count off at the master's count.** Even picking by position, one full cycle puts the same pick
  on two rows. A breakdown cannot have more rows than the master has entries
- **Values that do not point at each other but must still fit together are also handled by this table.** A set such as a name and a category,
  which would contradict if drawn separately, takes one set by identifier from a table of sets that could really occur. The generator builds fields
  one at a time, so it cannot express values decided as a set

**Replacing a whole set is handled by the same table.** When a listing endpoint returns `id`, a business key and a name in one
object, specifying them per field draws `id` and the business key separately and breaks the set. Take one entry from the listing endpoint
and replace the whole object.

The master responses themselves are built by the generator, so the business keys are declared in `orval.config.ts`. If the application also has
a transcription of the same business keys, the mock stands in for the backend, so **copy them by hand rather than importing them**. Building from the application's
transcription would make both drift by the same amount even if the transcription itself drifted, leaving no way to check.
That the two declarations match is checked by the contract-conformance test (below).

## Destinations without a handler fail in tests

`vitest.setup.msw.ts` starts with `onUnhandledRequest: "error"`. With passthrough, a fetch with a mistyped destination
goes out to the real network, and it surfaces only as arriving locally and timing out in CI.

**Even files that do not load it cannot go outside.** `vitest.setup.ts` places a guard on `fetch` and
fails the request, naming the destination. It produces no response, so a test that wants to stop HTTP should start
interception instead.

The dev server side (`src/instrumentation.ts`) stays on passthrough. **The mock replaces only the API**,
and images are fetched from their origin (below). Requests to a real server a test started are opened by
naming the destination (`passThroughOrigin` in `vitest.setup.msw.ts`).

## Images are not replaced

The mock replaces only the API. Images go straight out to the origin `MEDIA_ORIGIN` points at.
**Delivery is handled by an endpoint separate from the API, and images can be fetched even when the API is down**, so there is no reason
to replace them.

**Locally, with no origin running, only the images cannot be fetched.** Point `MEDIA_ORIGIN` at a real origin,
or check with responses that have no images. Verification through the screens places the whole fetch path out of scope,
returning a 1×1 picture from `/_next/image` ([e2e](../e2e/README.md)).

## Subscriptions (SSE) are not replaced

What can be generated is only the request-response pairs the contract declares, and **a long-lived connection does not have that shape**. Adding a hand-written
handler would make one, but that means assembling by hand a response the contract declares yet the generator cannot produce,
creating, in this very place, an exception that breaks the one direction "when the contract changes, the mocks change".

**During development, connect to the real backend.** With `APP_API_MODE=mock`, screens with subscriptions stop in the "nothing
to receive" state — **what stops them is the application side, not the mock**. The ticket-issuing endpoint is in the contract,
so the generated artifact returns a realistic-looking response, and passing it through would make the browser keep reconnecting to a destination that does not
exist. Therefore the fetch endpoint that relays subscription ticket issuance refuses the issuance itself in a mock deployment.
The means of raising events is held by the backend side.

The catalog (Storybook) has no subscription target either. It has the ticket-issuing endpoint return "no target" and holds the screen
still in its waiting state (`.storybook/msw/handlers.ts`). **It does not return a connectable URL** because, if it did, the story would
actually try to connect and reconnect on every failure, never holding still.

The state a feature takes as the result of a subscription is given to the story through props
([0054](../docs/adr/0054-ui-catalog-storybook.md)).

## Contract-Conformance Test

For fields with a `pattern`, the generator emits `faker.helpers.fromRegExp(pattern)`, but this API
interprets neither shorthand classes like `\d` nor anchors, and returns the pattern string almost as-is. So
how to build those values is specified with `override.mock.properties` in `orval.config.ts`.

<!-- sample:replace-begin -->
Missing specifications are caught by `contract-conformance.test.ts`. It applies the response generators the generated artifacts export
(`get<Name>ResponseMock`) to the zod with the corresponding name (`<Name>`) and reconciles them. `nullable`
fields choose between a value and `null` at random, so it runs several times with a fixed seed (with only one run, it would pass only on the run
that drew `null`).
<!-- sample:replace-with -->
<!-- = Missing specifications pass silently, so once a contract is in, write the reconciliation test. Apply the response generators the generated artifacts export -->
<!-- = (`get<Name>ResponseMock`) to the zod with the corresponding name (`<Name>`), and for `nullable` fields -->
<!-- = run several times with a fixed seed (with only one run, it would pass only on the run that drew `null`). It reads the generated artifacts -->
<!-- = by name, so it cannot be written while there is no contract. -->
<!-- sample:replace-end -->

zod is not the only counterpart. Agreement between declarations aligned on the generator side (that a name one endpoint returns is among the spellings in another endpoint's
list) and agreement with business keys transcribed on the application side are also enforced here. Both are
disagreements invisible from the reference table — the table re-takes values after the response is assembled, and there it cannot tell that the generator's declarations
disagree with each other.

## Why an unused client lives here

orval requires an output destination (`target`) for the client. Meanwhile, outbound resilience is owned by the hand-written wrapper in
`adapters/server` ([0071](../docs/adr/0071-bff-api-integration.md)), so production never uses the generated client.
Putting it in `src/adapters/gen/` would leave "which one do we call through" ambiguous from the generated side,
so it is gathered here as a by-product of mock generation. The MSW handlers do not depend on this client.

## What to Change When Adopting

The mechanism (fixing the seed, re-taking references, failing on unhandled destinations) does not depend on the contract. **What can only be written
per contract is what you replace.**

| What | Default | Where to change it |
| --- | --- | --- |
| Value ranges the contract cannot express | Names master enumerations and regular expressions for fields with fixed digits or formats | `override.mock` in `orval.config.ts`. Write your own contract's value ranges following the judgment [above](#value-ranges-the-contract-cannot-express-are-named-in-configuration) |
| Cross-endpoint reference table | `references.ts` holds which field points at which endpoint, and `handlers.ts` passes it to `stableHandlers` | `references.ts` and `handlers.ts`. It fails if a field the table points at has disappeared from the contract <!-- sample:line --> |
| Contract-conformance test | `contract-conformance.test.ts` validates every handler's response against the corresponding zod | It reads the generated artifacts by name, so the spelling follows when the contract is swapped <!-- sample:line --> |

The fetch coordinates of the contract itself are owned by [`openapi/README.md`](../openapi/README.md#what-to-change-when-adopting).

**Authentication does not appear here** (below). Swapping the IdP requires no change to this layer.

## Why authentication is not mocked here

**Authentication does not pass through this layer.** The round trip with the IdP goes out to the endpoints OIDC Discovery exposes at runtime,
and neither types generated from the contract nor MSW handlers sit in between ([0079](../docs/adr/0079-auth-frontend-seam.md)).

There are two ways to reach an authenticated state locally, and neither is here. Either start a development IdP and
go through the normal login, or issue a session directly from `/dev/session`
([src/features/dev-session/](../src/features/dev-session/README.md)).

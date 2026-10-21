# Data Classification and the Cache Boundary (PII / User-Scoped)

Classifies values by "**in which execution boundary and which cache scope they may be used**", and **removes from the ordinary implementation path** the ways of writing that put them in the wrong place. It defines how classification is held (on the fetch endpoint, not on the value), where the checkpoints are and what each checkpoint can see, and the division of responsibility among classification, PPR, taint and React Compiler. Whereas [0111](0111-csp-security-headers.md) owns the body of the response headers, this ADR owns **where along the path a value travels what gets stopped**.

## Status

Accepted

## Context

Enabling Cache Components (PPR) **creates new paths by which user-scoped values land in shared or static areas**. The accident of User A's personal data entering a shared cache and being served to User B is the most damaging one the presentation layer can cause.

The convention alone ("only what can be fetched without naming a principal may enter the Data Cache" in [`docs/rules.md` *Rendering and Caching*](../rules.md#rendering)) does not stop it. If `RequestSpec` in `adapters/server/http` is shaped so that **any client can accept** `cache` / `tags`, writing `cache: "force-cache"` on an endpoint that carries credentials passes type checking. **What is needed is enforcement**.

[0030](0030-environment-variable-management.md) holds the defense against mistaken Server → Client sends. **The boundary on the cache side is owned by this ADR.**

## Invariants

Every decision in this ADR is placed to satisfy the following six. **The invariants take precedence over individual decisions.**

1. **The confidentiality of PII / user-scoped data takes precedence over rendering optimization**
2. **The capability of shared / static caches is given only to public fetch paths**
3. **User-scoped data is request-scoped and uncached by default**
4. **CSR for the sake of PII is allowed, but its Client Island is kept to the necessary minimum**
5. **PII crossing the Server → Client boundary is repacked into the minimal necessary Client DTO**
6. **Performance policies such as SSR-First / PPR / React Compiler are no reason to loosen the PII boundary**

**PII is not a target of rendering optimization but a target whose exposure is minimized.** Performance optimization is done only inside that confidentiality constraint. The priority order is as follows, and the upper always outranks the lower.

```text
Confidentiality > cache efficiency > SSR ratio > PPR coverage > bundle minimization
```

## Decision

### 1. Classification is held not on the value but on the "fetch endpoint"

The approach of wrapping values (wrapper types like `PublicData<T>` / `UserScopedData<T>`) is **not adopted**.

- **Unwrapping erases the classification.** The moment you write `wrapped.value.email` it goes back to `string`, and the guarantee is cut at the first rendering point. That is where PII legitimately goes out, so **the guarantee never reaches the places that need it**
- Instead, every feature pays for writing the wrap / unwrap. **The cost lands on every line; the effect shows in only two places**

The surfaces where accidents happen concentrate on **the moment of putting into a cache** and **the moment of passing to the client**. So classification is declared where the value is born = **the fetch endpoint (the client of `adapters/server/http`)**, and **the arguments that endpoint can accept change per classification**.

```ts
createHttpClient({ scope: "public" })       // cache / tags を受け取る。資格情報の口は持たない
createHttpClient({ scope: "user-scoped" })  // 資格情報を載せられる。cache / tags を型として持たない
```

**"Do not put PII in a shared cache" becomes the absence of an argument rather than a warning.** The absence is placed on both sides — a public endpoint does not even have the credential-fetching endpoint as a type. If the classification cannot tell "does this client carry credentials", there is no point in giving the endpoint a classification.

### 2. Classifications and their allowed placements

| Classification | What it is | Allowed placement |
| --- | --- | --- |
| **public** | What can be fetched without naming a principal (master data, public catalogue) | Static rendering / shared cache / the PPR static shell / sending to the client |
| **user-scoped** | What is bound to a principal (profile, per-user lists, usage history) | Request scope / dynamic RSC. **No shared cache and no static generation**. To the client only after repacking |
| **secret** | Signing keys, tokens | Server internals only. None of cache, static rendering, client DTO or sending to the client |

**`secret` does not go through this fetch path.** It is closed in `config/*.server.ts` and held by `import "server-only"` and the taint of [0030](0030-environment-variable-management.md). **Values are few and do not go out to rendering, so here a branded / opaque value type is worth its cost** (only secrets are wrapped).

### 3. An endpoint that may carry credentials is user-scoped, including the times it did not carry them

Even a request that may be sent anonymously (`allowAnonymous`) is classified user-scoped if it goes through an endpoint that may carry credentials. **The classification is a property of the endpoint (connection point), not a per-request result**, so it is determined statically and can be blocked by types. Whether a request may be sent when no credential could be obtained is declared per operation by the contract, and the request's `allowAnonymous` carries it. Setting it does not move the classification.

When you want to cache a user-scoped value, the only means is **`use cache: private`** (not stored on the server; held only in the browser's memory).

However, **`use cache: private` is not a general permission saying "user-scoped may be cached".** It is treated as an explicit exceptional capability, used **only in places where the need can be explained**. The default is uncached, as in invariant 3.

### 4. Checkpoints are placed as stages; no single place guards everything

Along the path a value travels, there are **things visible only at that place**. So protection is not concentrated in one place but placed per stage.

| Stage | What it stops | Means | Detected at |
| --- | --- | --- | --- |
| **Fetch endpoint** | Passing `cache` / `tags` to a user-scoped fetch | Types (absence of the argument) | typecheck |
| **Before entering the cache** | Importing a user-scoped adapter from a module that has `use cache` (the import target and one step beyond) | lint (`project-rules/no-user-scoped-in-cached-module`) | `lint:ci` |
| **Rendering** | Reading `cookies()` / `headers()` from a cached scope. Credentials come from cookies, so placing a user-scoped fetch under `use cache` fails with `next-request-in-use-cache` | framework | build or runtime |
| **At fetch time** | Cache settings in a spec assembled bypassing the types, and credential headers brought in per call | The gate in `adapters/server/http` | throw at request time |
| **Before sending to the client** | Passing a server object to the client as is | taint ([0030](0030-environment-variable-management.md)) | at render time |
| **Delivery** | A user-scoped response landing in a shared cache (CDN / proxy) | A response header. `src/proxy.ts` attaches `Cache-Control: private, no-store` to responses to requests carrying a session cookie ([0111](0111-csp-security-headers.md)) | at response time |

**Each stage sees what the other stages cannot.** The fetch endpoint alone is bypassed the moment `use cache` is written; taint alone is slipped by derived values and copies; headers alone do not work on shared caches inside the app.

**Stage 2 judges per module, reading the spelling of the endpoint's classification.** The classification's spelling lives in the connection point, and a module that lines up fetch endpoints only pulls in the connection point, so the import target and one step beyond are read. The only thing not counted at the one-step-beyond level is the kernel that assembles clients — it holds both spellings to declare the classification as a type, and would misjudge even modules going through the public connection point. An analysis that follows, name by name, whether it reaches the endpoint is not worth this stage's role, so a module where an endpoint and pure conversions live together stops even if only the conversion is pulled in — fix the one that stopped (give the conversion its own module). Moving the spelling into a constant would silence the stage itself, so a separate check watches that the spelling remains.

### 5. "Credentials are resolved from cookies at the point of use" is made a convention and checked mechanically

The defense of stage 3 (framework) hangs on **credentials being resolved from `cookies()` at the point of use**. Putting a token into a module variable, carrying it around in arguments, memoizing across a boundary — any of these makes **this defense come off without a word**.

So this premise itself is made a convention and subjected to mechanical checking. Adding stages does not make it thinner as long as the added stages rest on the same premise. **The way to close it is not adding a layer but making the premise checkable.**

The shape of the check is "**only an imported endpoint may be passed to the credential-fetching endpoint**" (`project-rules/no-captured-bearer-token`). A function assembled on the spot can hide a captured value, but an imported endpoint has its declaration in one place, and reading it shows the resolution path. The declaration that passes the fetching endpoint to the client is also in one place, the user-scoped connection point ([0071](0071-bff-api-integration.md)).

**The exception is only the one round trip that establishes the session.** At that point there is no cookie yet, and no endpoint that resolves from cookies exists. This one place is passed with a separate spelling, `bearerToken` (an already-resolved value). **The spelling is separated so that the places where the defense comes off can be counted**, not because the places it may be passed have increased.

**So the exception's spelling is watched by the same check.** What may be passed to `bearerToken` is only **an argument the enclosing function received in that call** — because a token being established arrives together with the call. Being countable is not enough: the connection point takes the shape of pinning the client in a module variable, and bringing this spelling into that shape would make the first request's token sit there for the lifetime of the process, with everyone afterwards going out as that principal. **An exception without enforcement becomes a bypass.**

### 6. Do not confuse responsibilities

| Mechanism | Responsibility |
| --- | --- |
| Classification + fetch endpoint | Constrains **where it may be used** with types and arguments |
| PPR / Cache Components ([0041](0041-cache-components-decision.md)) | Prevents mistaken entry into shared / static areas (the cache policy side) |
| taint ([0030](0030-environment-variable-management.md)) | Detects mistaken Server → Client sends at runtime |
| React Compiler ([0042](0042-react19-rendering-api.md)) | **Performance optimization only.** Independent of PII / cache / security boundaries, and opt-in |

**React Compiler is not a PII protection mechanism.** It is kept separate from this ADR's design.

### 7. CSR for PII is allowed, but the Client Island is kept minimal

Places that handle PII may be made CSR if needed. **Giving up SSR / PPR for the sake of PII is allowed.** Since confidentiality takes precedence over performance (invariant 1), this is not a compromise but the default order.

**However, dropping the whole screen to CSR for that reason is forbidden.** Only the range that needs PII is cut out as the smallest Client Island.

```text
Page
├─ Static / Server content
├─ public data
├─ UserMenu ← CSR / user-scoped (only here)
└─ public data
```

**CSR is not a means of making PII safe.** PII still reaches the browser, so even when CSR is chosen, keep the following.

- Fetch only the needed attributes (Decision 8)
- Keep what is held in client state to a minimum
- Do not persist unnecessarily to `localStorage` / `sessionStorage` and the like
- Do not put it into analytics / telemetry / logs / error reports (the redaction of [0081](0081-observability-logging.md) / [0082](0082-client-observability.md) is authoritative)
- Keep the Client DTO minimal, and do not pass server objects as is (invariant 5)

### 8. Minimize fetching, holding and sending alike

Not only how the boundaries are placed, but **the fetched data itself is minimized**.

- ❌ Fetching the whole User from the User API while the client uses only the name
- ✅ Identify the needed attributes → the minimal necessary DTO / endpoint / projection → use only that range

**PII fetched, PII held and PII sent are all minimized.** If the contract returns only an excessive shape, repacking is done at the fetch endpoint (the conversion boundary of [0072](0072-api-type-generation.md)), and only the minimized shape is passed to inner layers.

### 9. Order of judgment

Screens / components containing PII are decided in the following order. **Do not choose CSR from the start; look for the smallest exposure.**

```text
1. Is that PII really needed?
2. Minimize the needed attributes
3. Can it be handled safely server / request-scoped?
4. Avoid shared / static caches
5. Can it be confined to a PPR dynamic hole?
6. If needed, make only the smallest range CSR
7. Minimize the Client DTO
8. Apply runtime guards such as taint
```

## Prohibitions

- ❌ Passing `cache` / `tags` to a user-scoped fetch (Decision 1 / 3)
- ❌ Putting user-scoped values into caches stored on the server side (Data Cache / `use cache` / `unstable_cache`). The only means is `use cache: private` (Decision 3)
- ❌ Resolving credentials by any path other than `cookies()` (module variables, carrying around in arguments, memoization across boundaries) (Decision 5. The only exception is the one session-establishing round trip where no cookie exists, which is passed with the `bearerToken` spelling)
- ❌ Expressing classification with wrapper types and spreading unwrapping across the feature layer (Decision 1) (Enforcement: none — a decision not to adopt. Classification is held on the fetch endpoint rather than wrapper types, and a change adding wrapper types appears in the diff as added types)
- ❌ Assuming any one stage guards everything and omitting the other stages (Decision 4) (Enforcement: Prose — **not mechanizable**. Whether a stage was omitted depends on a judgment of whether the reason for removing it is "another stage suffices", not on the shape of the code)
- ❌ Counting React Compiler as a defense for the PII / cache boundary (Decision 6) (Enforcement: Prose — **not mechanizable**. What is counted as a defense is a design judgment and does not appear in code)
- ❌ **Making a whole screen CSR because it contains PII** (Decision 7; cut out the smallest Client Island)
- ❌ **Processing PII with SSR / PPR on the grounds of SSR-First** (invariants 1 / 6) (Enforcement: Prose — **not mechanizable**. The motive for choosing SSR / PPR does not appear in the shape of the code)
- ❌ **Putting user-scoped data into a shared cache to improve the cache hit rate** (invariants 1 / 2)
- ❌ **Sending the whole User object when the client uses only part of it** (Decision 8)
- ❌ **Mixing public data and PII in the same cacheable DTO** (the moment they mix, the whole becomes user-scoped)
- ❌ **Loosening the PII boundary for the sake of performance** (invariant 6) (Enforcement: Prose — **not mechanizable**. The motive for loosening the boundary does not appear in the shape of the code. The result of loosening appears in the diff as changes to types and lint)

## Notes

- **Relationship to [0020](0020-adopted-architecture.md)'s design principle of not pre-emptively handling a problem another layer owns**: this ADR's stages do not violate it — **each guards its own post**, rather than writing a second copy of an answer that lives elsewhere. Only the point where stage 3 and the fetch-time gate both rest on the premise of Decision 5 is duplication, and it rests on that principle's **security exception** (division of responsibility is no reason to thin a defense).
- **Memoization with `cache()`**: session restoration (`readSessionRecord`) and `verifySession` are wrapped in React `cache()`, folding decryption to once per request. This is memoization closed within rendering one request, not a shared cache, and may be used inside the request scope of invariant 3. Inside `use cache`, `React.cache` runs in a scope isolated from the outside, so an already-resolved value never reaches inside via the memoization path, and calling `verifySession` from under a server-stored `use cache` is stopped by stage 3 as a `cookies()` read (`node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md` "React.cache isolation", "Request-time APIs"). The stage 2 lint reads the spelling of the classification, so it does not reach modules that only pull in `verifySession`. What the isolation blocks is only the memoization path; passing a resolved `Session` into `use cache` as an argument or a closure puts it on the cache key — this falls under the prohibition "putting user-scoped values into caches stored on the server side", and no mechanical stage stops it. Inside `use cache: private`, `cookies()` is allowed and stage 3 does not fire, but that is on the side of Decision 3's exceptional capability.
- **Trade-off**: the readability of ordinary implementation barely changes (feature-side code does not grow; what changes is the one line of choosing an endpoint when writing an adapter). In exchange, endpoints that may carry credentials lose the option of shared caching. If you adopt the optimization "put what can be fetched anonymously into a shared cache", **splitting the endpoint** is the condition.

- **Relationship to SSR-First**: [0040](0040-routing-rendering-strategy.md) makes Server Components the default and states that no rendering mode is closed off. This is **a default for performance and UX**, not a constraint that outranks the confidentiality of PII. The default is kept, while in ranges containing PII invariant 1 takes precedence and decisions are made in the order of Decision 9.
- **Relationship to PPR**: the PPR of [0041](0041-cache-components-decision.md) is treated as **a performance optimization for public data**. For user-scoped values, confidentiality takes precedence over the benefits of shared / static caching.

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the design principle of not pre-emptively handling a problem another layer owns (precautions beyond one's responsibility / the security exception)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — leak defense (`server-only` + taint). This ADR's "before sending to the client" stage
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — Cache Components (PPR). This ADR presupposes it being enabled
- [0071-bff-api-integration.md](0071-bff-api-integration.md) — the layer that owns caching and revalidation. The Rationale for "only what can be fetched without naming a principal may enter the Data Cache" in `docs/rules.md` *Rendering and Caching*
- [0072-api-type-generation.md](0072-api-type-generation.md) — no type leakage (wire types are not exposed to inner layers)
- [0029-type-design-discipline.md](0029-type-design-discipline.md) — branded / opaque (the value type for secrets)
- [0111-csp-security-headers.md](0111-csp-security-headers.md) — response headers. This ADR's "delivery" stage
- [0110-security-operations.md](0110-security-operations.md) — the overall picture of security operations
- [0042-react19-rendering-api.md](0042-react19-rendering-api.md) — React Compiler is performance optimization only (outside this ADR's scope)

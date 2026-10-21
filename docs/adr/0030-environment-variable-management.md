# Environment Variable Management

This ADR fixes the contents of the **`config` kernel** whose slot [0020](0020-adopted-architecture.md) / [0021](0021-frontend-responsibility.md) reserved. It defines environment-variable **validation (when and where) / the shape of typed config (per purpose, no single object) / the distribution mechanism / the `NEXT_PUBLIC_` boundary (server / client split) / the receiver-side implementation patterns / peripheral rules**.

## Status

Accepted

## Context

The basic form of env handling is to **read and validate once at startup, then distribute it as an immutable typed config with no setters** (immutable fail-fast). Variables are **split into code default and required**, secrets carry a management label, and **a typed loader per subsystem injects only the fields it needs**. Carrying this form, aligned with the backend, straight into the frontend raises two concerns: **making end users pay the lead time of env validation and baking**, and **the default env lookup result being a mutable object**. This ADR defines a design that resolves both.

## Decision

### 1. Validation (complete, no cost to users)

- **Validate every ENV (whether `NEXT_PUBLIC_` or not)**. Schemas are defined **per purpose** (§2), and the **complete set**, server and client variables alike, is validated (per purpose, yet nothing escapes validation)
- Validation runs at **two points only**:
  - **At build time** — `next.config.ts` imports the schemas and evaluates the complete set. Missing or invalid values fail the build
  - **Once at server startup** — `register()` in `instrumentation.ts` imports the config modules (= module evaluation = validation). On serverless it runs once per instance cold start
- **Validation does not run on the request path or in the browser**. Parsing inside a request handler and fetching config at runtime in a Client Component are **forbidden as anti-patterns**. This keeps the cost of validation and baking off end users (the "only once at startup" principle is placed, on the frontend, at the startup / build boundary)

### 2. Typed config (immutable, per purpose / no single object)

- **Do not build a single giant Config object**. Config is built as independent, typed, immutable modules **per purpose (subsystem)** (e.g. `authConfig` / `apiConfig` / `analyticsConfig`). Each receiver imports **only the config of its own purpose**. This carries through the principle of injecting only the fields needed: not "slice one Config with getters" but **an independent module per purpose** (minimal blast radius, tree-shaking, a clear composition root)
- **The reader determines the purpose.** A purpose is the unit of the subsystem that reads a value, and which purpose a value belongs to is decided by who reads it. The prefix of an environment variable name is the naming unit of [0028](0028-naming-convention.md) and is independent of purpose — variables with the same prefix may split into different purposes by reader, and a variable that uses an external standard name as-is may still belong to a purpose
- Each config is **an immutable object with `#` private fields and getters only**. `#` private is untouchable at runtime too, so `Object.freeze` is unnecessary. It has no setters. Re-creating it outside tests is forbidden (deep freeze is mandatory only when a plain object is the public surface)
- **Reading `process.env` directly is limited to `src/config/` (the per-purpose config modules)**. **It is mechanically enforced by biome's `noProcessEnv`** (the capability-based principle of [0002](0002-formatter-linter.md); only the config directory is excluded by an override). The origin of env is closed inside the config kernel
- **Split each purpose × server / client**: each purpose config is split by the kind of fields it contains into **server config** (contains secrets) and **client config** (NEXT_PUBLIC only). A purpose has **one or both** of server / client (e.g. `analytics` = public ID <client> + sending key <server>)
  - server config (`<purpose>.server.ts`) — puts `import "server-only"` at the top, blocking it from the client bundle at build time. A runtime object that contains secrets
  - client config (`<purpose>.client.ts`) — consists **only of references that name a `NEXT_PUBLIC_` variable by string literal** (the form `process.env["NEXT_PUBLIC_FOO"]`; dot notation is also replaced, but [0002](0002-formatter-linter.md)'s `noPropertyAccessFromIndexSignature` rejects it in type checking). Dynamic access (a subscript other than a string literal) and destructuring are **forbidden**, because the build-time literal replacement does not apply to them
- `NEXT_PUBLIC_` is **inlined as a literal at each reference** at build time (a public constant; structurally unwritable on the browser side). A client config is "a typed view of inline literals" and **not a runtime object**. Therefore the import-boundary restriction (§3) applies **only to server config (runtime object, secrets)**, and client-side layers may import client config freely

### 3. Distribution (instead of a DI container)

- Distribution mechanism = **a singleton via the ESM module cache** (one evaluation per process; everyone who imports gets the same immutable instance). What a DI container's provide / inject does is done with assembly at module scope + import
- The governing part of DI = **import-boundary rules**. **Only that purpose's `adapters/server` (+ the startup / build boundary) may import a server config (a runtime object holding secrets)** (consistent with the [0021](0021-frontend-responsibility.md) dependency matrix). Inner layers **receive values as arguments** rather than a server config (inner layers do not know config). Note: client config (NEXT_PUBLIC inline literals) is a public constant, not a runtime object, so client-side layers (`adapters/client` / `capabilities` / Client Components) may also import it
- The startup / build boundary (`instrumentation.ts` / `next.config.ts` / `app/metadata` <[0025](0025-app-layer-elements.md)> / `proxy.ts` <the config it can reach stops at `environment.ts` → `application-environment.ts`; [0043](0043-middleware-policy.md)>) is allowed to import server config as dedicated elements outside the 11 kernels (the startup / build boundary exception of [0021](0021-frontend-responsibility.md))
- Each adapter's factory imports only its own purpose's config and assembles a singleton (a mini composition root). An aggregated entry point over all purpose configs (a single facade such as `config.auth`) is **not built**

### 4. Default-vs-required governance

- **Code default (immutable)** — a variable whose default value lives on the schema side. It may be omitted from env files and is used for framework-like universal values
- **Required (variable)** — a variable every environment must supply. A missing one fails validation (startup / build abort)
- Selection rule: a project-specific value that changes per environment → required / a universal value → code default
- **An optional variable treats unset and the empty string as the same "not specified".** The env file of a serving environment lists only the variables the platform supplies and has no override lines for verification (pinning the clock, etc.) — a line that only puts a name behind `#` is also read as "the supplier provides it", so it counts among the lines it does not have. Failing a missing value as invalid stops production from starting, and treating only the empty string differently makes the meaning depend on how the env file is written
- **Do not hold the same fact in two variables.** The serving scheme (whether https) is not learned from a separate variable that represents "the kind of environment"; it is derived from the IdP callback URL — where the IdP sends the browser back, that is, our own origin. Cookie `secure` and the serving headers (HSTS / `upgrade-insecure-requests`) need the same answer, so the decision lives in one place in config

### 5. Secret boundary

- Variables carry a **Secret management label**:
  - **Secret management required** — supplied in production from a secret manager / the PaaS secret store. Never committed in a plaintext `.env`
  - **Secret management recommended** — periodic rotation recommended
- **Putting a secret in `NEXT_PUBLIC_` is forbidden** (`NEXT_PUBLIC_` is exposed to the browser). A secret is always a server-only variable

### 6. Env files and supply (consistency with 0011 no-Docker)

There is no mechanism that bakes env into the served artifact ([0011](0011-no-docker.md) no-Docker / PaaS and static CDN delivery). Therefore:

- **Supply to `process.env` is unified into reading `env/.env.<environment>`, selected by `APP_ENV`, exactly once at the startup / build boundary** (`load-environment.ts`). No other place reads `.env*` directly. The config modules become the only place that reads that `process.env` (Decision 2)
- **Production secrets and per-environment values are supplied from the env / secret store of the PaaS (Vercel / Amplify, etc.)** (the delivery premise of [0011](0011-no-docker.md)). They are not committed to plaintext files
- Documentation is **two documents** with separate scopes of authority. The same content is not written twice:
  - **`env/README.md` = the authority on which environment variables exist**. It maintains every variable defined in this environment in a **variable table** (`Variable Name | Description | Type | Example | Notes`). A variable whose value is only a placeholder, and a variable the app does not read through config (one an external SDK reads directly by its standard name, etc.), are listed here as long as they exist
  - **The `config` kernel README = the authority on explaining configuration values** ([0021](0021-frontend-responsibility.md), which has each layer keep its own README). For **configuration values that are validated at build time and fed into each purpose module at construction**, it explains the purpose division, the server / client boundary, required vs code default, and how receivers use them
  - The **existence** of a variable belongs to the env side; the **meaning and handling** of a configuration value belong to the config side. What config lists is a subset of the env side
- **Adding an env variable requires user confirmation**
- **The environment selector `APP_ENV` must be specified**. Leaving it unspecified is the state "cannot choose which file to read" and fails startup / build; it **does not fall back to a default**. With a default, a real environment that forgot to set `APP_ENV` reads the bundled `env/.env.local` and starts with only the variables it forgot to inject filled with local values. The decisions whether to allow the bundled secret values and whether to open development-only endpoints look at the same selector, so a default makes it impossible to tip "unset" toward the safe side
- **Only the development entry points pass `local`** (the `pnpm dev` / `pnpm storybook` / `pnpm build-storybook` scripts). `pnpm build` / `pnpm start`, which produce the served artifact, have no default; the supplier (PaaS / CI) always declares it
- **Whether a development-only endpoint (issuing a session for an arbitrary role, etc.) may be opened is decided by `APP_ENV` itself, not by the API connection mode.** It may be opened only for `local` / `ci`. If the connection mode were the condition, only the prose promise "do not put mocks in real environments" would be closing the endpoint in real environments

### 7. Receiver-side implementation patterns (receivers of per-purpose config)

The single pattern "the constructor receives a SubConfig" splits by receiver in Next.js (per-purpose config = §2):

| Receiver | How it receives | Dependency on config types |
| --- | --- | --- |
| Boundary adapters (fetch wrappers / API clients in `adapters/server`, etc.; [0024](0024-adapters-server-client-split.md)) | Injects **that purpose's server config** into a factory at module scope and assembles a singleton (a mini composition root). The factory knows only its own argument types and is config-independent | Yes (the **only permitted layer** for server config) |
| Screen RSC inside a feature / Route Handler (`app/route-handler`) / Server Action (`features/*/actions.ts`) | Only imports and uses assembled adapters (`adapters/server`). Referencing server config directly is forbidden (`app/route-segment` = `page.tsx` is a thin call site that calls features and does not touch adapters directly either) | No |
| **metadata routes** (`app/metadata` = `robots.ts` / `sitemap.ts` / `manifest.ts`, etc.; [0025](0025-app-layer-elements.md)) | As elements of the startup / build boundary, **may import that purpose's config directly** (site URL / per-env noindex, etc.) | Yes (startup / build boundary) |
| Inner logic (`model` / the orchestrating part inside a feature) | Receives values as arguments (does not know the origin = env). The caller strips the values off the server config and passes them | No |
| Client Components / hooks / `adapters/client` / `capabilities` ([0024](0024-adapters-server-client-split.md) / [0022](0022-capabilities-kernel.md)) | Imports **that purpose's client config** (NEXT_PUBLIC inline literals) (no secrets; not a runtime object, so no boundary restriction) | Client side only |

- Correspondence: provide → inject = assembly at module scope → import. "Inner layers cannot see config" = passing as arguments + enforced import boundaries (mechanized by the Enforcement of [0021](0021-frontend-responsibility.md))
- **Prohibition**: **do not pass server config values as props** from an RSC to a Client Component (they are serialized into the HTML as the RSC payload and leak to the browser). A value the client needs is placed from the start in `NEXT_PUBLIC_`, in **that purpose's client config**

### 8. Leak defense (two layers)

- **`import "server-only"`** is the mandatory guard of server config (reliable, stable)
- **The React taint API** (`experimental_taintObjectReference` / `experimental_taintUniqueValue`) is adopted. It is enabled in every environment

#### Why taint is adopted while still experimental (exception)

Enabling it (`experimental.taint` in `next.config.ts`) makes Next.js **swap the React it ships to the client from stable to an experimental-channel build** (`needsExperimentalReact()`). Measured, the React in client chunks changes from `19.3.0` to `19.3.0-experimental-<date>`, and **every route uniformly gains +6.3 KB gzip** even with no call written. It is adopted anyway for these two reasons.

- **The implementation is React itself** (not an experimental third-party library)
- **The upstream side has material that explicitly covers taint** (the react.dev references for both APIs, and the Next.js `data-security` guide recommends its use)

**Enabling it only in dev / CI is not adopted.** It would remove experimental from production, but at the price of a different inconsistency: "the React that is verified differs from the React that is shipped".

#### Why structure cannot replace it

Even if the fetch endpoint is made to require a projection, **the identity projection (`to: (w) => w`) remains**. That is not a deviation but the natural form written when "the shape the screen wants equals the response", and what structure can achieve stops at "protected if written correctly" — it is not a mechanism.

#### Position — a supplementary defense, not the primary mechanism

Taint is **stage 4 (before sending to the client)** of [0112](0112-data-classification-cache-boundary.md) and not the primary mechanism of PII defense. The primary defenses are minimizing the fetch scope, restricting cache capability, request scope, and minimizing Client DTOs; taint catches, at runtime, a mis-send that slipped through them. **It can only track by reference and does not reach copies or derived values**.

#### Implementation

- **The endpoint is the single `adapters/server/taint/taint.ts`**. Application code does not call `react`'s experimental API directly. Tests swap this module boundary, and **that the real thing works is confirmed by this endpoint's own tests** against the experimental React bundled with Next.js and the RSC serializer. No "call it if the endpoint exists" branch is placed inside the defense (the day the endpoint disappears, the check would silently drop out with it)
- **React resolution in tests** — the global alias is not moved (client-side tests need stable). Only the taint endpoint's tests load the experimental build bundled with Next.js, swapping it together with CJS name resolution. Its location is traced from the `next` package (`experimental-react.fixture.ts`)
- **Where string secrets are registered** — on the reading side. `config` declares `imports-allowed: []` and cannot bring in react. The signing key is registered by `adapters/server/auth/resolver.ts`, and the lifetime of the registration is held by the singleton that holds the value (`AuthConfig`)
- **What is tainted, and at what granularity** — **taint that one object where the value is born**. A session record is tainted right after it is restored. Nesting is not followed — since tracking is by reference only, a finer granularity does not close the escape routes (copies, derived values); the primary defense is held by minimizing the fetch scope and Client DTOs

#### When the exception ends

When `experimental_taint*` lands in stable React and enabling it no longer involves a channel switch, the exception text is dropped from this ADR. The check can be done mechanically.

```text
node -e "console.log(Object.keys(require('react')).filter(k=>/taint/i.test(k)))"
[]                                               → exception in effect
[ 'taintObjectReference', 'taintUniqueValue' ]   → exception resolved
```

## Peripheral Rules (Handed to Other ADRs)

- **A value you want to change without redeploying** is not placed in env but **escaped to the BFF runtime config** (treated as an exception, caching mandatory, kept off user-perceived latency). The concrete design of where it escapes to (endpoint / caching scheme) is **the responsibility of [0071](0071-bff-api-integration.md) (BFF / API integration)**
- **Minimize the surface area of `NEXT_PUBLIC_`** (a change always incurs the lead time of a rebuild)
- **A server env read inside an SSG / ISR page is frozen into the prerender result** ([0040](0040-routing-rendering-strategy.md) / [0041](0041-cache-components-decision.md))
- **`proxy.ts`** (the former Middleware in Next.js 16) runs on the Node.js runtime by default, but may be placed on the CDN (Edge-equivalent) when optimized, so **the config reachable from `proxy.ts` does not read ENV files**. The reachable range stops at `environment.ts` → `application-environment.ts`, and reading ENV files with Node APIs and `dotenv` (`load-environment.ts`) is called only by the startup / build boundary ([0043](0043-middleware-policy.md)). **Ownership of where this boundary is drawn lies with this ADR (the config kernel)**
- **Tests**: done with **an env stub + re-creating via the factory** (`new ServerConfig(stubEnv)`), not by mutating the frozen instance (use in production code is forbidden). The concrete API is [0090](0090-testing-strategy.md)'s **Vitest `vi.stubEnv`**

## Prohibitions

- ❌ Runtime env validation / parsing inside a request handler / in a Client Component (Enforcement: ESLint `no-restricted-syntax` (direct reads of `process`) and biome `noProcessEnv` reject the forms that read and parse env outside the config kernel and the startup boundary. Calling config validation functions from the request path or the client is Prose — **mechanizable** (the form that rejects imports of `@/config/environment` and `*.schema` outside the startup / build boundary; no rule exists))
- ❌ Reading `process.env` directly from anywhere other than the config modules (enforced by biome `noProcessEnv`)
- ❌ Giving a config object a setter / re-creating it outside tests / building a single facade that bundles every purpose (Enforcement: Prose — **partly mechanizable**. Setter declarations and exports of a Config class can be rejected by looking at `set` accessors and exports of classes in `src/config/**`, but no rule exists. Whether something is a single facade is decided by the meaning of what it bundles)
- ❌ Dynamic access to / destructuring of `NEXT_PUBLIC_` variables in `client.ts` (build-time replacement does not apply) (Enforcement: Prose — **mechanizable** (the form that rejects computed-property references to `process.env` (subscripts other than string literals) and destructuring in `src/config/**/*.client.ts` with ESLint `no-restricted-syntax`; no rule exists))
- ❌ Putting a secret in `NEXT_PUBLIC_` (Enforcement: Prose — **partly mechanizable**. That a variable with a Secret management label does not carry `NEXT_PUBLIC_` can be rejected by cross-checking the variable table in `env/README.md`, but no rule exists. Whether a value without a label is a secret is decided by the meaning of the value)
- ❌ Letting an unspecified `APP_ENV` fall back to a default (in any of file selection, the decision on secret values, or development-only endpoints) (Enforcement: `src/config/application-environment.test.ts` pins an unspecified value in the decision function to the side that closes the endpoint, and `src/config/load-environment.test.ts` pins an unspecified value in ENV file selection to a startup error. Places that write a default for `APP_ENV` without going through the decision function (serving scripts or new readers) are Prose — **mechanizable** (the form where a gate checks that `package.json`'s `build` / `start` have no default for `APP_ENV`, and that only `application-environment.ts` reads `APP_ENV` directly; no rule exists))
- ❌ Deciding whether a development-only endpoint is open by the API connection mode rather than the environment (Enforcement: `src/config/application-environment.test.ts` pins the shared decision to open and close by the value of `APP_ENV`. A new endpoint branching on the connection mode without going through that decision is Prose — **mechanizable** (the form where a gate checks that development-only endpoints (`*.dev.ts` / `page.dev.tsx`) go through `isDevelopmentAccessAllowed` and do not condition on `APP_API_MODE`; no rule exists))
- ❌ Passing server config values as props from an RSC to a Client Component
- ❌ Importing a **server config** (a runtime object containing secrets) from any layer other than `adapters/server` and the startup / build boundary ([0021](0021-frontend-responsibility.md); client config <NEXT_PUBLIC inline literals> may be imported from client-side layers — §2 / §3)

## Notes

- This ADR fixes the **architecture** "type-define and validate every ENV with per-purpose schemas (per purpose, yet the complete set is validated)" and does not pin it to a schema library name. Adopting a library follows the adoption flow of [0004](0004-library-management.md) (exact pin + `pnpm audit`)
- This ADR defines the **policy** of the `config` kernel. The physical implementation (per-purpose config modules + schemas + a variable-table README + validation calls in `instrumentation.ts` / `next.config.ts` + biome `noProcessEnv` with the override excluding the config modules ([0002](0002-formatter-linter.md))) follows this policy. The `new-env` skill targets this structure (the per-purpose config modules in `src/config/` + the variable table) ([0155](0155-claude-skills-development.md))

## Related ADRs

- [0020-adopted-architecture.md](0020-adopted-architecture.md) / [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the slot reservation for the `config` kernel and the dependency matrix (the only layer permitted to import config = `adapters`). This ADR fixes its contents
- [0011-no-docker.md](0011-no-docker.md) — no-Docker / PaaS delivery (baking does not work → `env/.env.<environment>` + PaaS secret store)
- [0027-directory-structure.md](0027-directory-structure.md) — the physical location of the `config` kernel
- [0028-naming-convention.md](0028-naming-convention.md) — the naming format of environment variables (`{SUBSYSTEM}_{NAME}` / the `NEXT_PUBLIC_` prefix). The prefix is independent of purpose. This ADR defines the boundary, validation and typing
- [0002-formatter-linter.md](0002-formatter-linter.md) — the capability-based division for mechanically enforcing the ban on reading `process.env` directly (biome `noProcessEnv`)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) / [0071-bff-api-integration.md](0071-bff-api-integration.md) — where runtime config escapes to, and what receiver adapters connect to
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) / [0041-cache-components-decision.md](0041-cache-components-decision.md) — env freezing during prerendering
- [0079-auth-frontend-seam.md](0079-auth-frontend-seam.md) — the development-only session-issuing endpoint (what is opened and closed by environment)
- [0090-testing-strategy.md](0090-testing-strategy.md) — the concrete API of env stubbing (`vi.stubEnv`)
- [0153-ci-configuration.md](0153-ci-configuration.md) — wiring build-time validation into CI
- [0043-middleware-policy.md](0043-middleware-policy.md) — the range of config reachable from proxy (see "Peripheral Rules" above)

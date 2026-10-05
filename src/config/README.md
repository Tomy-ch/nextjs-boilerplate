---
imports-allowed: [] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [ui, fetch, business-logic]
test-requirement: unit
coverage-exclusions:
  - "src/config/environment.fixture.ts"
---

# config

The kernel that provides typed configuration by purpose. Each config is an immutable ESM singleton that exposes only `#` private fields and
getters.

## What Belongs Here

- Environment variable validation, per-purpose config, and the immutable public surface of setting values

## What Does Not Belong Here

- UI, fetch, business logic

## Config List

| Module | Purpose | Kind | Readers |
| --- | --- | --- | --- |
| `application-environment.ts` | Resolving `APP_ENV`, and decisions determined by environment variables alone (whether the environment may open development-only endpoints). It uses no Node API, so it is reachable from `proxy.ts` | server + build boundary | `environment.ts` / `load-environment.ts` / `next.config.ts` / `adapters/server/auth` |
| `load-environment.ts` | One-time loading of `env/.env.<environment>`. It uses `dotenv` and `node:path`, so only the startup / build boundaries call it | server + build boundary | `bootstrap.server.ts` / `next.config.ts` / build script / `playwright.e2e.config.ts` |
| `environment.ts` | Full validation bundling every purpose's validators, and the in-process cache of its result | server + build boundary | each `*.server.ts` / `next.config.ts` |
| `environment.fixture.ts` | A complete set of environment variables that passes validation (test-only; the only place that writes the list) | test | This kernel's tests, and tests of readers that swap `getEnvironment` |
| `validate-environment.server.ts` | Aggregate startup entry point that, when imported, calls every server Config getter once | server | `bootstrap.server.ts` only |
| `bootstrap.server.ts` | ENV loading and full config validation at startup | server | `src/instrumentation.ts` |
| `api/api.schema.ts` / `api/api.server.ts` | Schema / Config for the API base URL and the connection mode | server | `adapters/server` and the startup / build boundaries |
| `auth/auth.schema.ts` / `auth/auth.server.ts` | Schema / Config for OIDC and the BFF session. The schema also holds the decision of whether it is served over https (`isServedOverTls`) | server | `adapters/server` and the startup / build boundaries |
| `clock/clock.schema.ts` / `clock/clock.server.ts` | Schema / Config for the "now" that screens read | server | `app` and the startup / build boundaries |
| `maintenance/maintenance.schema.ts` / `maintenance/maintenance.server.ts` | Schema / Config for whether serving is stopped | server | `proxy` and the startup / build boundaries |
| `media/media.schema.ts` / `media/media.server.ts` | Schema / Config for the media origin | server | `adapters/server` and the startup / build boundaries |
| `observability/observability.schema.ts` / `observability/observability.server.ts` | Schema / Config for the service name, the OTLP endpoint, and per-signal exporters | server | the startup / build boundaries |
| `http/http.schema.ts` / `http/http.server.ts` / `http/http.client.ts` | Schema / Config for the upper limits on request URL and upload byte counts, and for the parties allowed to call the BFF from another origin | server + client | `adapters/server` / `adapters/client` / `src/proxy.ts` and the startup / build boundaries |
| `site/site.schema.ts` / `site/site.server.ts` | Schema / Config for the externally visible origin and whether indexing is allowed | server | `app` (root layout metadata / `sitemap.ts` / `robots.ts`) and the startup / build boundaries |
| `analytics/analytics.schema.ts` / `analytics/analytics.client.ts` | Schema / Config for the container ID of the tag manager loaded behind the consent gate. **Empty is the instruction "do not load"**, and is the switch that removes the dependency on Google | client | client islands in `app` |
| `security-headers/security-headers.ts` | Building the response headers attached to every route (CSP and its companion headers) | build boundary | `next.config.ts` |

Each `config/<purpose>/<purpose>.schema.ts` owns the Zod validators belonging to its purpose, and the corresponding
`<purpose>.server.ts` owns the immutable Config. `environment.ts` only calls the validators to run full validation,
and holds no per-variable rules. `next.config.ts` runs validation at build time, and
`src/instrumentation.ts` at server startup.

## Shape of a Purpose Module

A purpose is a unit of the **subsystem** that reads the values, and the reader looks it up. The variable-name prefix
(`{SUBSYSTEM}_{NAME}` in [0028](../../docs/adr/0028-naming-convention.md)) is a unit of naming independent of purpose: variables with the same prefix
can split into different purposes depending on their readers, and a variable using an external standard name as is can belong
to a purpose. A purpose consists of the following three kinds of file, and every purpose takes the same shape.

### `<purpose>.schema.ts` — per-variable validators

- Export one function returning a validator per variable (`<name>Validator()`). `environment.ts` lays these out
  keyed by variable name.
- Export the type `<Purpose>Environment`, holding the purpose's variables under keys equal to their variable names. The value types
  are derived from the validators with `z.infer<ReturnType<typeof <name>Validator>>`, so types are not written twice.
  `fromValues()` in `<purpose>.server.ts` takes this type.
- **Import only the validator library.** Read neither `process.env` nor `APP_ENV`. Make environment-dependent
  conditions (whether a bundled secret value is allowed) **arguments** of the validator, and passing them is `environment.ts`'s responsibility.
  If the schema read the environment, tests of a validator alone would depend on the execution environment.
- Pure functions a reader needs (ones like `isServedOverTls` that derive another fact from validated values) also go in the schema.
  It has no `server-only`, so the build boundary can read them too.

### `<purpose>.server.ts` — immutable Config and singleton

- `import "server-only"` at the top.
- `class <Purpose>Config` has only `readonly #field` + `private constructor` + `static fromValues(values:
  <Purpose>Environment)` + getters, and **the class is not exported**.
- One pair, the module variable `let <purpose>Config: <Purpose>Config | undefined` and
  `export function get<Purpose>Config()`, makes the singleton. Its body is the single line
  `??= <Purpose>Config.fromValues(getEnvironment())`; neither re-reading ENV nor parsing happens
  here.
- Getters are exposed **in the form that answers the reader's question**. On / off switches are folded into boolean questions
  (`isStopped` / `isIndexable` / `tracesEnabled`); raw `on` / `off` values are not handed out. Named choices
  (connection mode, where authorization starts) are returned as they are (`mode`). The line with `forbidden: business-logic` is
  "questions determined by that variable alone"; decisions beyond that are held by the reader.
- Decisions determined **only** by environment variables are held by this kernel (whether the environment may open development-only endpoints, whether it is
  served over https), and **decisions combined with other state are held by the reader**. Even when the authorization start is `dev`, whether to actually
  choose the development path is decided by `adapters/server/auth` together with the environment. The config only carries that value,
  and the getter's documentation states that "this value alone has no effect".
- An accessor that returns a new value on each call does not share the returned object. Even a fixed "now" has `now()` return a new
  `Date` each time — handing out the same object would let a destructive operation by one receiver propagate to the next caller.

### `<purpose>.client.ts` — typed view of `NEXT_PUBLIC_`

- It holds only the form `export const NAME: type = <transform>(process.env["NEXT_PUBLIC_..."])`. The variable name is named by a string
  literal, and no validation is done (what gets substituted at build time is the value that passed validation itself).
- Values whose same variable is read on both server and client (request URL / upload limits) take this form to confine the threshold declaration to one
  line of env. **The client-side decision is not relied on** — in the browser the sender can swap it,
  so the receiving endpoint checks again with the same value ([0075](../../docs/adr/0075-file-upload-seam.md)).
- Place only values that are harmless to expose to the browser. Write the basis for "harmless" (the container ID appears in the URL that loads the tag)
  in the module's documentation.

### When adding a purpose or a variable

1. Add the validator function and the `<Purpose>Environment` key to `<purpose>.schema.ts`.
2. Register it by variable name in `environmentSchema` in `environment.ts`. This is the only place they are bundled.
3. Add the field / `fromValues()` / getter in `<purpose>.server.ts`, or the constant in `<purpose>.client.ts`.
4. For a new purpose, add the getter call to `validate-environment.server.ts`. Forgetting it leaves the purpose out of
   startup validation, and it fails on the first request.
5. Add it to both `VALID_ENVIRONMENT` and `PARSED_ENVIRONMENT` in `environment.fixture.ts`. The former uses
   `satisfies Record<keyof Environment, string>`, so type checking catches omissions.
6. Place `<purpose>.schema.test.ts` and `<purpose>.server.test.ts` (see Testing below).
7. Update `env/.env.*`, the variable table in [`env/README.md`](../../env/README.md) (the source of truth for which variables exist), and this README's
   list (the source of truth for what setting values mean). The division is [0030](../../docs/adr/0030-environment-variable-management.md).
8. Put the reader in `adapters/server` or the startup / build boundaries. For the authority on adding readers, see Operations.

`/new-env` follows this procedure.

## Validation Vocabulary

Validators check **the shape of a variable** and do not judge what the value means. The same shape is written the same way.

| Shape | How it is written | Variables using it |
| --- | --- | --- |
| http / https URL | `z.url()` with a protocol `refine` | Connection targets, issuer, callback, OTLP endpoint |
| origin (scheme + host + port, no path) | `refine` with `new URL(value).origin === value` | Values compared for exact equality with the `Origin` header, the base of absolute URLs |
| Choice | `z.enum([...])` | Connection mode, where authorization starts |
| Optional choice | `z.string().trim().optional().transform(empty → default).pipe(z.enum([...]))` | On / off switches |
| Optional free value | `.optional()` + `refine` + `transform(empty → undefined)`, or `.default("")` with a `refine` that allows empty | Fixed "now", container ID |
| Byte count | `z.coerce.number().int().positive()` | Upper limits |
| Comma-separated list | `.default("")` → split / trim / remove empty elements → `refine` each element | Allowed origins |

- **Distinguish origin from URL.** If a value used as the base of absolute URLs (the externally visible origin) allowed a path,
  `new URL("/path", base)` would discard that path and the result would diverge from the intent. A value compared with the `Origin` header
  must also have the same shape, or exact equality fails. Origins put into the CSP are reduced by the building side to `new URL(value).origin`,
  so whether a value received as a URL has a path or port does not affect the form that is emitted.
- **For optional variables, unset and empty string are treated alike as "not specified"** ([0030](../../docs/adr/0030-environment-variable-management.md)). The env files of serving environments list only the variables the platform provides, and have no
  switch lines for validation or operations.
- **Put the default on the side that does no harm to an environment that forgot to set it** — do not stop, do not allow indexing, do not load,
  same origin only, do not fix, go to the IdP. With the opposite defaults, an environment that forgot to inject a variable would start up with every route
  stopped, a preview would appear in search results, and the third-party dependency that was supposed to be removed would open. A default may be on the side that "does
  something" only when the value is correct regardless of environment (the range of rendering spans), and the basis is written in
  the validator's documentation ([docs/rules.md](../../docs/rules.md#config), the rule "do not put a setting value whose basis
  cannot be stated").
- **The criterion for allowing omission is "is the default correct regardless of environment".** If it is, do not make it required — making it required
  in every environment adds lines to real environments' settings that only say "this is not for development". Values that change per environment are
  required, and their absence fails startup / build.
- **Validate the spelling when a wrong value would go out with another effect.** The container ID's shape is checked because a wrong
  value would leave the tag unloadable while the response header permission stayed open; the shape check is there to stop that
  side effect.
- **The schema knows the spelling of bundled secret values and rejects them outside `local` / `ci`.** Forgetting to set one shows up not as "no
  value" but as "a known value is present", so a length check lets it through. The check sits at startup,
  stopping before a single cookie is issued. Whether to allow it is decided by `environment.ts` from `APP_ENV` and
  passed as an argument.
- **Do not hold the same fact in two variables.** Whether it is served over https is derived from the IdP callback URL (its own
  origin), and the cookie's `secure` and HSTS / `upgrade-insecure-requests` read the same single decision
  ([0030](../../docs/adr/0030-environment-variable-management.md)).
- **Gather validation failures into one Error that lists the missing / invalid variable names.** Readers' tests match
  failures by variable name.

## Execution Mechanics and Evaluation Timing

Config is not evaluated per request. ENV is loaded once, per-purpose singletons are built from the validated values,
and from then on they are wired through imports.

```text
build / Next.js initialization
  next.config.ts
    ├─ loadEnvironment()
    │    └─ selects env/.env.<environment> from APP_ENV (required)
    ├─ validateEnvironment()
    │    └─ validates all ENV once with getEnvironment()
    └─ reads getEnvironment()'s validated values and the schema's pure functions,
       and assembles delivery headers / allowed image hosts / body limit / whether dev-only routes are included

Node.js server instance startup
  Next.js → register() in src/instrumentation.ts
    └─ bootstrapConfig() in config/bootstrap.server.ts
         ├─ loadEnvironment()
         └─ imports validate-environment.server.ts
              └─ calls every purpose's get*Config() and initializes the singletons
    └─ reads the connection mode from the API config and, if mock, sets up interception (after validation)
    └─ reads the signal configuration from the observability Config and initializes the OTel SDK and logger

Request handling
  adapters/server → imports the per-purpose Config singletons
  (ENV loading and schema parse are not re-run)
```

| When | What runs | What is evaluated | How often |
| --- | --- | --- | --- |
| Next.js config evaluation | `next.config.ts` | Loading the selected env file, validating the shape of all ENV, and building the build settings from the validated values | Per build / dev startup |
| Node.js server startup | `src/instrumentation.ts` → `bootstrap.server.ts` | Creating the server Config singletons | Per new server instance |
| Config singleton creation | `getApiConfig()` and the like | Copying the shared evaluation result of `getEnvironment()` into private fields | On the first getter call, once per process |
| Normal requests | `adapters/server` | Reading the singletons' getters | Per request, but without parsing |
| unit test | `vi.stubEnv()` and `vi.resetModules()` | Setting env stubs and re-evaluating the Config module | Per test call |

`loadEnvironment()` loads with `override: false`, so it does not overwrite variables CI / PaaS has already injected.
`env/.env.dev`, `.env.stg` and `.env.prd` hold values only for what is the same regardless of deployment and for
that environment's policy values; connection targets and secrets get only their names, and the real values are supplied from the PaaS environment settings or a secret
store (for the line format, see Writing the Files in [`env/README.md`](../../env/README.md#ファイルの書き方)).

An unspecified `APP_ENV` is returned as `null` and does not fall back to a default. File selection, allowing bundled secret values,
and opening and closing development-only endpoints all look at this selector, so having a default would make it impossible to tip "unset"
toward the safe side ([0030](../../docs/adr/0030-environment-variable-management.md)). The list of environments that may open development-only
endpoints lives in only one place, `application-environment.ts`, and both build (whether to include development-only routes in the bundle)
and runtime (whether to open the endpoints) read the same decision — if the list were in two places, a change widening only one of them
would pass silently.

`src/instrumentation.ts` is a Next.js convention file, and Next.js automatically runs `register()` while preparing
a server instance. The Edge runtime cannot read files with Node.js,
so only the Node.js runtime calls `bootstrapConfig()`. After bootstrap it reads the observability Config and
injects the values into the OTel SDK and the logger. Config itself does not import logger / observability.

**Evaluating only once extends to operational switches too.** Stopping / resuming serving are both operations that change the deployment target's environment settings
and restart; there is no endpoint that applies them to a running process. Values that must change without a redeploy
are not put in env (the related rules in [0030](../../docs/adr/0030-environment-variable-management.md)).

**For values baked into prerendering, pass the same ENV to build and start.** The metadata of statically rendered screens
and `robots.txt` are read at build time, so the served artifacts assume a build per environment
([env/README.md](../../env/README.md)).

## Config Wiring

- `next.config.ts`, as the build boundary, calls `loadEnvironment()` and `validateEnvironment()` directly.
  What it then reads are the validated values of `getEnvironment()` and the schema's pure functions, not the `*.server.ts`
  singletons — a module with `server-only` throws when evaluated outside the react-server condition,
  so it cannot be imported from the build boundary.
- The script that produces the served artifacts (`pnpm build`) also calls `loadEnvironment()` before reading `process.env`.
- `src/instrumentation.ts`, as the startup boundary, calls only `bootstrapConfig()`. **Processing that branches on the connection mode
  (mock interception) goes after `bootstrapConfig()`** — placed before validation, it could swap the
  production connection target based on unvalidated values.
- `bootstrap.server.ts` imports `validate-environment.server.ts` and calls every server Config getter once.
- `adapters/server` and `proxy.ts` import only the `get*Config()` of the purposes they need; feature / model / component do not import Config. The server config `app` reads directly is **only the values Next.js conventions require to be placed in a route segment** (see Operations below).
- When inner logic needs a setting value, the adapter takes it from the getter and passes it as an argument.
- The Config classes and the ENV parser are not exported outside the module. Ordinary code is given no path to regenerate a Config from arbitrary ENV.
- Unit tests re-evaluate the module cache with `vi.stubEnv()` and `vi.resetModules()` and verify the public singletons.

## Operations

- Direct reads of `process.env` live only in this kernel (in `src/`, the biome `noProcessEnv` override exempts only this kernel and `src/instrumentation.ts`).
- Server config is protected with `import "server-only"`. Its readers are mainly `adapters/server`, the startup / build boundaries, and the entry point `proxy.ts`; **`app` directly reads only the values Next.js conventions require to be placed in a route segment** (`config/site`, read by the root layout and metadata, and `config/clock`, read by screens as "now"). **Development-only screens that are not in the production bundle** (`page.dev.tsx` under `dev/**`) also exist in a form that reads `config/api` / `config/auth` directly (recorded in the element table of [0025](../../docs/adr/0025-app-layer-elements.md)). **The authority on readers is not here but the layer-definition mapping of [0021](../../docs/adr/0021-frontend-responsibility.md) and the prohibitions of [0025](../../docs/adr/0025-app-layer-elements.md)**; what is stated here is only their shape — a decision to add readers moves those first. Routing through `adapters` would only add a fetch endpoint for a value whose location is already set by convention.
- Client config goes in `*.client.ts`, which holds only references naming `NEXT_PUBLIC_` variables by string literal. No validation is done there (the browser is not where validation runs). Do not pass server config values to the client as props. Client config is a public constant, not a runtime object, so it is not subject to import boundary restrictions, and client-side layers and `app` can read it ([0030](../../docs/adr/0030-environment-variable-management.md)).
- [env/README.md](../../env/README.md) is the source of truth for the list of environment variables, the templates, and the secret-management labels.
- Config reachable from the proxy does not read ENV files. The reachable range stops at `environment.ts` → `application-environment.ts` and does not reach `load-environment.ts`, which uses `dotenv` / `node:path`. The startup / build boundaries have already loaded the ENV files (Edge compatibility in [0043](../../docs/adr/0043-middleware-policy.md); `scripts/proxy-edge.gate.test.ts` checks the reachable graph).

## Building Response Headers

`security-headers/security-headers.ts` holds no rationale for the headers' **contents** ([0111](../../docs/adr/0111-csp-security-headers.md)).
What it holds is the shape of the building.

- **The inputs are the raw validated ENV values and the serving conditions** (https or not / dev server or not), which `next.config.ts`
  passes from `getEnvironment()`. Writing ENV-derived origins directly here would make the environment variables and the settings two places
  that move separately.
- **Values are given meaning in one place.** "Empty means do not load" is not collapsed to a boolean on the calling side; the container ID is
  received as a string and the building side decides. The same interpretation does not appear in two places, the passing side and the receiving side.
- **A value received as a URL is reduced to `new URL(value).origin` before being emitted.** Whether it has a path or a port does not
  change the emitted form.
- **Only the parts that change by condition carry a reason**: `'unsafe-eval'` only on the dev server (React uses it to reassemble
  server-side error stacks), HSTS and `upgrade-insecure-requests` only when served over
  https (emitted on an http development environment, they rewrite even subresources so they cannot be fetched), and third-party serving origins only in
  deployments that declared a container ID (otherwise only attack surface remains for something not loaded).
- **Headers that do not depend on the request go in `headers()` of `next.config.ts`.** Added in `src/proxy.ts`, they would ride only on
  routes the proxy handles, and statically servable responses would miss them. Request-dependent headers are held by `src/proxy.ts`.
- **Serving-configuration decisions are not included.** HSTS `includeSubDomains` / `preload` are decided by the serving configuration, so they are not added;
  only the duration is aligned with the preload list's lower bound.
- **The allow list names only the wildcards.** Listing representative hosts the wildcard covers separately
  only adds lines.

## What to Change When Adopting

This kernel only validates values that come from environment variables; **the values themselves are held by
[`env/README.md`](../../env/README.md#boilerplate-導入時の変更点).** What is written here are
the defaults baked into code without going through environment variables.

| What | Default | Where to change |
| --- | --- | --- |
| Third-party origins the response headers allow | Has a branch that, for deployments loading a tag manager, puts Google's serving origins and measurement destinations into `script-src` / `connect-src` / `img-src` | `security-headers/security-headers.ts`. To switch to another tag manager, move both these origins and the loading point (`src/app/analytics.tsx`) |
| Defaults under `script-src` | No third-party origins other than the above are allowed. Request-independent headers are attached by the serving side | Same as above. When adding, follow the decision in [0111](../../docs/adr/0111-csp-security-headers.md) |

`security-headers` belongs to the build boundary and is read by `next.config.ts`. Unlike the per-purpose configs it depends on
neither the request nor environment variables, so swapping it means changing code.

## Testing

- **Only `environment.fixture.ts` holds the complete set that passes validation.** The schema validates all purposes together,
  so even a test checking one purpose needs the complete set. If each test stubbed only its own part, it would fail on the absence of other
  purposes and never reach the decision it means to check. `VALID_ENVIRONMENT` is raw values deliberately scattered across the
  accepted shapes; `PARSED_ENVIRONMENT` is post-validation values with the exporters dropped so observability emits no signals, and
  **the latter is not the result of parsing the former**. Tests at boundaries that swap `getEnvironment` read the latter.
- **Shape of `*.server.test.ts`**: in `beforeEach`, `vi.resetModules()` → `vi.unstubAllEnvs()` →
  `stubValidEnvironment()`; in `afterEach`, `vi.unstubAllEnvs()`. The subject is loaded with
  `await import()` after stubbing. A case changing one variable overrides `vi.stubEnv()`, and absence is expressed with
  `vi.stubEnv(name, undefined)`. Failures are matched by variable name (`toThrow("VAR_NAME")`).
  Being a singleton is checked by identity (`toBe`).
- **Shape of `*.schema.test.ts`**: call the validator directly and check acceptance / rejection with the result of `safeParse().success` or
  `parse()`. Touch neither ENV nor the module cache.
- **Do not assume the execution environment's `APP_ENV`.** CI declares `ci` in the workflow, so cases checking "when
  unspecified" remove it explicitly with `vi.stubEnv("APP_ENV", undefined)`.
- **Swap file loading with `vi.doMock("dotenv")`.** Pin the loaded path, `override: false`, and
  being one-time through the call's arguments and count.
- Cases that read the clock fix the real clock with `vi.useFakeTimers()` + `vi.setSystemTime()` and restore
  `vi.useRealTimers()` in `afterEach`.

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: ui` — renders no screens | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) (what each kernel is responsible for). Mechanical: `project-rules/no-markup-outside-ui-layers` |
| `forbidden: fetch` — holds no external IO such as `fetch`. It holds only environment variable validation and the publication of validated values | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) (what each kernel is responsible for) |
| `forbidden: business-logic` — holds no business logic. Judging what a value means sits on the reader's side | violation. suggestion when it cannot be told whether something is a validation rule or a business decision | [0021](../../docs/adr/0021-frontend-responsibility.md) (what each kernel is responsible for) |
| `*.server.ts` is imported only by `adapters/server`, the startup / build boundaries (`src/instrumentation.ts` / `next.config.ts` / `src/proxy.ts`), `app/metadata`, and route segments reading values Next.js conventions require to be placed in a route segment (`config/site` / `config/clock`). Direct reads by `page.dev.tsx`, which is not in the production bundle, are a known form recorded by 0025 and out of scope | An import from outside the allowed set is a violation | The dependency matrix and Enforcement of [0021](../../docs/adr/0021-frontend-responsibility.md) / the prohibitions of [0025](../../docs/adr/0025-app-layer-elements.md) / Operations in this README. The machine sees `config` only at layer granularity |
| `*.client.ts` holds only references naming `NEXT_PUBLIC_` variables by string literal — no dynamic access (subscripts other than string literals), destructuring, non-`NEXT_PUBLIC_` variables, or validation calls | violation | How [0030](../../docs/adr/0030-environment-variable-management.md) places client config, and its prohibitions / [docs/rules.md](../../docs/rules.md#config) |
| `*.schema.ts` reads neither `process.env` nor the `APP_ENV` decision. Environment-dependent conditions are received as validator arguments, passed by `environment.ts` | violation | Shape of a Purpose Module in this README |
| Do not put secrets in `NEXT_PUBLIC_` | violation if a variable carrying a secret-management label in [`env/README.md`](../../env/README.md) is named `NEXT_PUBLIC_`. suggestion if a value with no label but used as a signing key or credential is named `NEXT_PUBLIC_` | The prohibitions of [0030](../../docs/adr/0030-environment-variable-management.md) / [docs/rules.md](../../docs/rules.md#config) |
| Do not pass server config values to client components as props. Values the client needs go in a `NEXT_PUBLIC_` client config from the start | violation | The prohibition rules of [0030](../../docs/adr/0030-environment-variable-management.md) / Operations in this README |
| Do not export the Config classes and the ENV parser outside the module | violation | [docs/rules.md](../../docs/rules.md#config) / Config Wiring in this README |
| An optional variable's default is on the side that harms an environment that forgot to set it (stopping, allowing indexing, loading third parties, allowing other origins) | suggestion if the validator's documentation does not hold the basis for the default being correct regardless of environment | Validation Vocabulary in this README / [0030](../../docs/adr/0030-environment-variable-management.md) (handling of optional variables) / [docs/rules.md](../../docs/rules.md#config) |

## Related ADRs

- [0021](../../docs/adr/0021-frontend-responsibility.md) — The line up to which layers may read settings
- [0028](../../docs/adr/0028-naming-convention.md) — Environment variable naming (`{SUBSYSTEM}_{NAME}` / `NEXT_PUBLIC_`). The unit of purpose is this prefix
- [0030](../../docs/adr/0030-environment-variable-management.md) — The structure of `env/`, per-purpose config, the `NEXT_PUBLIC_` boundary, handling secrets, the position of code defaults, making `APP_ENV` required
- [0075](../../docs/adr/0075-file-upload-seam.md) — The upload path, and how far inside the relay the allowed byte count is taken
- [0076](../../docs/adr/0076-payment-ui-seam.md) — The payment UI seam. The basis for closing `payment` by default
- [0079](../../docs/adr/0079-auth-frontend-seam.md) — Authentication modes and the front end's share of the session
- [0111](../../docs/adr/0111-csp-security-headers.md) — The contents of the CSP and its companion headers, the decision to put request-independent headers on the serving side, the conditions for letting another origin call the BFF, the decision to lower `Cross-Origin-Embedder-Policy` in deployments that load a tag manager
- [0131](../../docs/adr/0131-cookie-consent.md) — The decision not to adopt consent management, and the instruction not to load a tag manager by default

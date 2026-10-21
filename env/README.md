# Environment Variables

The per-environment values live in `env/.env.<environment>`. `src/config/load-environment.ts` loads the selected
file before Next.js starts or builds.

`APP_ENV` is the selector, and **it is required**. Starting without it fails, as the file to load cannot be
chosen. Any value other than the five fails the same way. Why it has no default is owned by
[ADR 0030](../docs/adr/0030-environment-variable-management.md). Only
`src/config/application-environment.ts` reads `APP_ENV` directly, and the decisions whether to allow the
bundled secret values, whether to open the development-only endpoints, and whether to put development-only
routes into the build bundle all go through that single resolution.

CI and the PaaS set `APP_ENV` to `ci`, `dev`, `stg` and `prd` respectively in their environment settings.
The file is loaded only once per process and **never overwrites values already in `process.env`** — values
injected by the PaaS / CI take precedence over the file's. For local development, `pnpm dev` /
`pnpm storybook` / `pnpm build-storybook` pass `local` as the default, so it works right after cloning. An
explicit `APP_ENV` beats that default. `pnpm build` and `pnpm start`, which produce what is served, have no
default, so specify it as in `APP_ENV=local pnpm build`.

**`APP_API_BASE_URL` is used at build time too.** Fetches that persist across requests
(`use cache` in [ADR 0071](../docs/adr/0071-bff-api-integration.md)) are also called during the build to
populate the cache. Running `pnpm build` with `APP_API_MODE=live` from somewhere that cannot reach the
fetch target fails there.

**In `mock` mode, `pnpm build` starts the fetch target itself** ([mocks/serve.ts](../mocks/serve.ts)).
Interception in `src/instrumentation.ts` only works in the process that set it up, and prerendering runs in
separate worker processes, so it does not reach them unless started as an HTTP endpoint. `APP_API_BASE_URL`
becomes its listening address.

`next.config.ts` also reads validated values at build time and decides the hosts allowed for `next/image`
(`MEDIA_ORIGIN`), the origins the served headers allow (`APP_API_BASE_URL` / `MEDIA_ORIGIN` /
`AUTH_ISSUER` / container ID), whether it is served over https (the scheme of `AUTH_REDIRECT_URI`), and the
request body limit (`NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES`). Pass the same values to `pnpm build` and
`pnpm start`.

## Writing the Files

The five files hold the same variables in the same order, and the order matches the variable tables below.
Even a variable irrelevant to an environment keeps its line, and the form of the line states "who provides
the value". The only exceptions are the two kinds listed below (overrides for verification, and the
development-only endpoints); those have no line in the files of served environments.

| Line form | Meaning | Example |
| --- | --- | --- |
| `NAME=value` | This file provides the value. The basic form for `local` / `ci` | `APP_API_MODE=mock` |
| `NAME=` | Keeps an Optional variable listed as "unspecified". Relies on unset and empty string meaning the same thing ([ADR 0030](../docs/adr/0030-environment-variable-management.md)) | `CLOCK_FIXED_NOW=` |
| `# NAME=` | The value is provided by the PaaS environment settings or a secret store. The file holds only the name | `# AUTH_SESSION_SECRET=` |
| `# NAME=candidate` | Same as above, with a candidate: the value normally used if one is set | `# AUTH_SCOPES=openid profile email api.read api.write` |
| `# NAME=on` | A switch whose Code default is on the off side. Removing the leading `#` is the act of "turning it on" | `# APP_MAINTENANCE_MODE=on` |

The files of served environments (`dev` / `stg` / `prd`) hold values on only two kinds of line: values that
are the same regardless of deployment and not secret (connection mode, service name), and policy values
only that environment declares (whether it may be indexed). Connection targets and secrets hold only the
name, and the real value is left to the supplier — no plaintext commits
([ADR 0030](../docs/adr/0030-environment-variable-management.md)).

- Overrides solely for verification (pinning the clock) have a value only in `ci`, and no line in the files
  of served environments. Writing one mixes verification concerns into production startup conditions, and
  even in the `# NAME=` form it would be read as "the supplier provides this"
  ([ADR 0030](../docs/adr/0030-environment-variable-management.md)).
- Variables belonging to the development-only endpoints (`AUTH_MODE`) are written only in the files of the
  environments where they take effect (`local` / `ci`). A line in a served environment's file invites
  setting a value that should have no effect. What decides the environments where they take effect is
  `APP_ENV` ([ADR 0030](../docs/adr/0030-environment-variable-management.md)).

## Variables by Subsystem

Sections correspond to the subsystem prefix (`{SUBSYSTEM}_{NAME}`, [ADR 0028](../docs/adr/0028-naming-convention.md)).
Variables an external SDK reads directly under a standard name (`OTEL_*`) keep that standard name, and only
values exposed to the browser carry `NEXT_PUBLIC_`.

The labels in the Notes column mean the following ([ADR 0030](../docs/adr/0030-environment-variable-management.md)).

- **Required** — missing fails the build / startup.
- **Code default `x`** — may be omitted; the schema fills in `x`.
- **Optional** — may be omitted; the default is "unspecified". Unset and empty string are the same.
- **Secret management required** — supplied from a secret store in production, never committed in plaintext.
  Does not carry `NEXT_PUBLIC_`.

In the Type column, `URL` accepts only http / https, and `origin` accepts only values without a path (the
form where `new URL(v).origin === v` holds). Validation runs once at build time and once at startup, and
never on the request path or in the browser.

### Application

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `APP_API_BASE_URL` | Base URL of the API the BFF connects to | URL | `http://localhost:8080` | Required. The per-environment API target |
| `APP_API_MODE` | API connection mode | `live` / `mock` | `live` | Required. `mock` is used only locally / in CI |
| `APP_MAINTENANCE_MODE` | Whether serving is suspended | `off` / `on` | `on` | Code default `off`. `on` replaces every route with the maintenance screen. Switching needs a restart |

### Clock

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `CLOCK_FIXED_NOW` | Pins the instant screens read as "now" | ISO 8601 date-time | `2026-01-01T00:00:00.000Z` | Optional. Unset or empty means the real clock. Only verification environments set it |

Screens that divide by calendar day put the division into the request query. If the query derives from the
real clock, the seed of the mock that builds responses from the contract moves with it, so that screen's
baseline image matches only during the calendar day it was captured. This is why only `env/.env.ci` holds a
value; served environments leave it unset and run on the real clock.

### Media

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `MEDIA_ORIGIN` | The serving origin for object keys the backend returns | URL | `https://media.example.com` | Required. This value alone decides the hosts allowed for `next/image` and CSP's `img-src` ([0045](../docs/adr/0045-fonts-and-images.md) / [0111](../docs/adr/0111-csp-security-headers.md)). If the origin resolves the bucket by host name, use the origin including that host |

### Observability

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `OBS_SERVICE_NAME` | Service name identifying the telemetry source | string | `Boilerplate Web` | Required. Appears as `service.name` on the resource of traces / metrics / logs. Use a value different from the counterpart service so the source can be told apart within the same trace as the backend |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP HTTP base endpoint | URL | `http://localhost:4318` | Required. Uses the OpenTelemetry standard name as is. Each signal appends `/v1/traces` and the like automatically |
| `OBS_TRACES_EXPORTER` | Enabling value for the trace exporter | string | `otlp` / `none` | Code default `none`. Empty string or `none` disables it. `otlp` builds the OTLP exporter |
| `OBS_METRICS_EXPORTER` | Enabling value for the metrics exporter | string | `otlp` / `none` | Code default `none`. Empty string or `none` disables it. `otlp` builds the OTLP exporter |
| `OBS_LOGS_EXPORTER` | Enabling value for the logs exporter | string | `otlp` / `none` | Code default `none`. Empty string or `none` disables it. `otlp` builds the OTLP exporter |
| `OBS_RENDER_SPANS` | How far rendering is put on spans | `none` / `screen` / `part` | `screen` | Code default `screen`. `screen` is the top of the screen (`page-content` / `view`); `part` goes down to the components a feature owns. With `part`, the spans of one render multiply by the number of components rendered, so open it up when investigating. Has no effect if tracing itself is disabled |

### Authentication

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `AUTH_MODE` | Where authorization starts | `idp` / `dev` | `idp` | Code default `idp`. `dev` issues sessions from `/dev/session` without running an IdP. Takes effect only in environments where the development-only endpoints are open (`local` / `ci`) |
| `AUTH_ISSUER` | OIDC issuer and the base for Discovery | URL | `https://idp.example.com/realms/main` | Required. **The bundled `local` / `ci` point at the development IdP**; replace it with your own IdP first |
| `AUTH_CLIENT_ID` | Public client ID for Authorization Code + PKCE | string | `<public client ID issued by the IdP>` | Required. No client secret needed. The bundled value is registered with the development IdP, so replace it with an ID registered anew with your own IdP |
| `AUTH_REDIRECT_URI` | OIDC callback URL | URL | `http://localhost:3000/api/auth/callback` | Required. Must exactly match the value registered with the IdP |
| `AUTH_SCOPES` | Space-delimited scopes for the authorization request | string | `openid profile email api.read api.write` | Required |
| `AUTH_SESSION_SECRET` | Secret protecting the BFF session cookie | string | `local-development-session-secret-change-before-production` | **Secret management required**. At least 32 characters. The values bundled for `local` / `ci` are in a public repository, so any other environment rejects them at startup |

### HTTP

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` | Upper limit in bytes for one request URL | integer | `8000` | Required. Enter the smallest limit on the path among browser / CDN / reverse proxy / backend. None of them has a default |
| `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` | Upper limit in bytes for one relayed upload | integer | `4194304` | Required. Set it inside the request body limit the deployment target imposes. A value outside it has no effect because the deployment target cuts it off first |
| `HTTP_ALLOWED_ORIGINS` | Who may call the BFF (`/api/*`) from another origin | comma-separated origins | `https://admin.example.com,https://app.example.com` | Optional. Empty means same origin only. Listed origins are opened via CORS and also trusted as senders of state-changing requests ([0111](../docs/adr/0111-csp-security-headers.md)). Paths and `*` are not allowed |

### Site

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `SITE_PUBLIC_ORIGIN` | This site's origin as seen from outside | origin (no path) | `https://www.example.com` | Required. Absolute URLs for canonical / `sitemap.xml` / OG images are built by appending the path to this value. Not taken from the request's `Host` (with a serving layer in between, it does not match the public name) |
| `SITE_INDEXABLE` | Whether search engines may index it | `off` / `on` | `on` | Code default `off`. `on` makes `robots.txt` allow crawling and removes `noindex` from screens. **Only the environment that may be indexed (usually `prd`) declares `on`** ([`docs/rules.md`](../docs/rules.md#config)) |

**These two are also read at build time.** The metadata of statically rendered screens and `robots.txt` are
baked into prerendering, so pass the same values to `pnpm build` and `pnpm start`. Swapping them only at
startup has no effect.

### Analytics

| Variable Name | Description | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID` | Container ID of the tag manager loaded behind the consent gate | string | `GTM-ABC1234` | Optional. **Empty does not mean "unset" but "do not load"** — this is the lever that removes the dependency on Google, and screens hold with it removed ([0131](../docs/adr/0131-cookie-consent.md)). Not a secret (the container ID appears in the URL that loads the tags, so it is always public on sites that use it). A deployment that sets a value accepts that `script-src` / `connect-src` / `img-src` allow Google's origins and that `Cross-Origin-Embedder-Policy` is lowered |

## What to Change When Adopting

The connection targets in `local` and `ci` point at the backend developed as this repository's counterpart
and at the development IdP run beside it. **None of them exists where you are, so nothing connects locally
until the values are replaced.** `dev` / `stg` / `prd` hold connection targets and secrets by name only, so
the values go into the PaaS or a secret store.

| What | Default | Where to change |
| --- | --- | --- |
| API target | `APP_API_BASE_URL` points at the local counterpart | `.env.local` / `.env.ci`, and the settings of served environments. **Also read at build time** (above) |
| IdP | `AUTH_ISSUER` / `AUTH_CLIENT_ID` point at the development IdP and the client registered there | Same as above. `AUTH_REDIRECT_URI` must exactly match the value registered with the IdP |
| Session secret | The `local` / `ci` values of `AUTH_SESSION_SECRET` are in a public repository, and other environments reject them at startup | Supply from a secret store for each served environment |
| Image serving origin | `MEDIA_ORIGIN` points at the local store. **Required even while no image is placed**; this value alone decides the hosts allowed for `next/image` and CSP's `img-src` | Same as above |
| Telemetry destination | `OTEL_EXPORTER_OTLP_ENDPOINT` points at the local collector, `OBS_SERVICE_NAME` at the default service name | To your destination, and a name that does not collide with the counterpart service |
| Public origin | `SITE_PUBLIC_ORIGIN` points at the local endpoint. Absolute URLs for canonical / `sitemap.xml` / OG images start from it | To your own origin as seen from outside |
| Indexability | `SITE_INDEXABLE` is Code default `off` | Only environments that may be indexed declare `on` |
| URL and body limits | `NEXT_PUBLIC_HTTP_MAX_URL_BYTES` / `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` have no default | Measure and enter the smallest limit on the path |
| BFF calls from another origin | `HTTP_ALLOWED_ORIGINS` is empty (same origin only) | Only when there is someone to open it to |
| Tag manager | `NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID` is empty (not loaded) | Enter a container ID only when using it. CSP's allowed origins move with it |

The meaning, type and requiredness of each variable are owned by the tables above. What is listed here is
only **what is false unless replaced**; every other default works untouched.

The fixed third-party origin values in the served headers are owned by
[`src/config/README.md`](../src/config/README.md#what-to-change-when-adopting), and the timeouts and retries of
outbound calls by
[`src/adapters/server/http/README.md`](../src/adapters/server/http/README.md#what-to-change-when-adopting).
Neither is an environment variable.

## Operations

- Variables used through config are validated by the schemas in `src/config/` at build time and at server startup.
- `NEXT_PUBLIC_` variables hold only public values that may be exposed to the browser. Secrets must not go there.
- `NEXT_PUBLIC_` is replaced with a literal at build time, so changing the value requires a rebuild. Swapping at startup has no effect.
- Before adding a new variable, confirm its purpose, the server/client boundary, required/default, and the secret management label. Adding one requires user confirmation ([ADR 0030](../docs/adr/0030-environment-variable-management.md)).
- The procedure for adding one is owned by the `new-env` skill (noted in [ADR 0030](../docs/adr/0030-environment-variable-management.md)). By hand, add a row to the variable table of the subsystem's section, and put one line in each of the five files in the form described under Writing the Files. For a variable read through config, also add at the same time the validator in `src/config/<purpose>/<purpose>.schema.ts`, the registration in `environment.ts`, the stub in `environment.fixture.ts`, and the getter in the runtime module ([`src/config/README.md`](../src/config/README.md)). Variables not read through config (those an external SDK reads directly under a standard name) still go in the table and the five files.

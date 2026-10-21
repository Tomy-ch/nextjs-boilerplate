# What This Project Deliberately Leaves Out

**Only two kinds of thing may end at "not included".** (a) What is the responsibility of another domain — the backend or
infrastructure — and (b) non-functional tool choices that are not a functional connection point. Every other front-end concern
is not cut off but given **a named extension point (seam)**. An unnamed omission leaves no trace that a line was drawn.

However, **do not place an empty interface alone**. An abstraction without an implementation is always rewritten at the point it is implemented.
For what is not bundled, all that is kept is the coordinates at the time of adoption.

The ADRs hold the reason for each item; this page stays an index.

## What Belongs to Another Domain

- **Container delivery of the application itself** — no `Dockerfile` / compose for the app is bundled. Delivery targets are PaaS and static
  CDN, and the presentation layer has no system dependency that needs confining in a container ([0011](../adr/0011-no-docker.md))
- **Supply-chain mechanisms that presume containers** — image scanning / signing / SBOM. Same reason as above ([0110](../adr/0110-security-operations.md))
- **DB / ORM / persistence, business logic, domain model** — owned by the backend. `/api/*` is limited to a thin
  proxy ([0070](../adr/0070-backend-role-separation.md))
- **Owning the contract** — the backend owns OpenAPI, and this side consumes it through generated types and validation. It is not copied
  by hand ([0070](../adr/0070-backend-role-separation.md) / [0072](../adr/0072-api-type-generation.md))
- **Copies of judgments the server owns** — the presentation layer does not hold the following
  ([0070](../adr/0070-backend-role-separation.md) / [0020](../adr/0020-adopted-architecture.md), on not pre-emptively handling problems another layer owns)
  - Deriving values the contract does not return. A value whose calculation rule lives in the backend, such as a total or a difference, is absent from the screen if absent from the contract
  - Distinguishing what the contract returns as one failure. Trying to split it makes the screen hold a judgment the server does not
  - Settling the population at execution time. An impact range fetched from the server before execution is only shown with a caveat that it may go stale, and is not used for judgment
  - Guaranteeing a value range. Constraining the range at input is the screen's convenience; the contract's value range is guarded by the server. Even when constrained, keep the rejection path
  - Exhaustive sanitization of upstream-originated values. A defense against an identifiable threat is still placed, even if it also exists elsewhere
- **Validating credentials and choosing the IdP** — credentials are relayed without validation, and only the design of the authentication screens is owned.
  Both the session method and the IdP depend on the use case ([0079](../adr/0079-auth-frontend-seam.md) / [0070](../adr/0070-backend-role-separation.md))
- **Abuse protection for public endpoints** — rate limiting and WAF are PaaS / edge responsibilities. All that is left in the app is
  minimal defenses such as content-type and body size ([0077](../adr/0077-bff-abuse-protection-boundary.md))
- **Compose that starts the backend / IdP / storage** — connect to the backend side's stack. If the presentation layer
  carried startup procedures, they would be managed twice ([0011](../adr/0011-no-docker.md))
- **The application's delivery procedure** — the only delivery workflow bundled is the one for the documentation site ([0141](../adr/0141-portal-operations.md))

## Non-Functional Tool Choices Not Held

- **Vendor SDKs for observability / RUM** (Sentry / Datadog, etc.) — the single outlet is OTLP. Notifications and alerts are covered by
  the OTLP-compatible backend it points at ([0081](../adr/0081-observability-logging.md))
- **Running Renovate alongside** — dependency updates are consolidated on Dependabot, which has a cooldown. The cooldown is the
  implementation of supply-chain quarantine itself ([0110](../adr/0110-security-operations.md))
- **Node-specific SAST** — covered by the rule set general-purpose SAST applies, so an overlapping layer is not added (same as above)
- **Fuzzing** — there is no in-house parser that decodes byte sequences from outside, so there is no target
  ([0090](../adr/0090-testing-strategy.md) / [0110](../adr/0110-security-operations.md))
- **The OpenSSF Best Practices badge** — a registration tied to the repository's name, not inherited by a copy ([0142](../adr/0142-license.md))
- **A scaffold that generates a skeleton from specifications** — the core of a specification is prose about "reasons not to do", and it falls away when used
  as generation input ([0143](../adr/0143-spec-driven-development.md))
- **Registering observation tools with MCP, and connecting to a real browser profile** — they are called from the CLI and observe only the local
  development server ([0156](../adr/0156-browser-observation-tooling.md))
- **DDD audits** — there is no domain layer, so no conformance to DDD is claimed. Aggregates, bounded contexts and
  ubiquitous language have no subject in this repository, and measuring the gap against an external source has nothing to measure
  ([0020](../adr/0020-adopted-architecture.md))

## What Depends on the Use Case and Is Not Decided Here

The app holds only the coordinates for adoption. These exclusions are no obstacle to introducing them.

- **i18n** — library, locale resolution, translation key scheme. The coordinates are `proxy.ts` and the `[locale]` segment ([0121](../adr/0121-i18n-strategy.md))
- **PWA** — manifest / Service Worker / offline. The coordinates are `app/manifest.*` ([0130](../adr/0130-pwa-strategy.md))
- **CMP and IAB TCF-equivalent consent management** — depends on jurisdiction and vendor. A lightweight consent mechanism and the
  hook that loads the tag manager are held ([0131](../adr/0131-cookie-consent.md))
- **The firing interface for product analytics** — what is bundled goes only as far as the hook that loads the tag manager container; no interface for passing values is held ([0082](../adr/0082-client-observability.md))
- **The mount seam for a payment SDK** — the SDK is not bundled; only the coordinates for adoption are recorded. The PCI boundary (not letting the
  front end hold raw card data) is unchanged whether or not it is adopted ([0076](../adr/0076-payment-ui-seam.md))
- **Hosting long-lived connections, the supply seam for dynamic feature flags** — the former is another domain's responsibility, and the subscribing side
  has its implementation in `adapters/client/stream/`. The latter is coordinates only ([0074](../adr/0074-runtime-communication-seam.md) /
  [0078](../adr/0078-dynamic-feature-flag-seam.md))
- **DnD, an execution mechanism for global shortcuts, a searchParams sync helper** — no library is bundled,
  and neither a registration mechanism binding arbitrary operations to arbitrary keys nor a layer syncing the URL with client state is placed
  ([0053](../adr/0053-ui-component-interaction-seam.md) / [0060](../adr/0060-state-management.md))
- **Publishing the mock app** — it is bundled as a basis for verification, but not made a surface shown to people. The moment it is published it becomes a demo,
  and no one is responsible for the correctness of what it shows ([0056](../adr/0056-mock-app-exclusion.md))
- **The license of the application itself** — MIT allows relicensing. Only retaining the notice for the parts derived from the boilerplate
  remains ([0142](../adr/0142-license.md))

### Where Runtime Capabilities Live

Only the placement of the following distinctions is decided ([0022](../adr/0022-capabilities-kernel.md)).

- **Whether there is a connection** and **page visibility** are runtime capabilities, held by `capabilities`. They are not specific to a screen
- **Whether a connection is alive** (including the wait before reconnecting) is the state of the communication mechanism, held by the subscription adapter.
  It is distinct from the former, and screens need both
- **Key handling that completes within a screen** goes inside the UI, without building a registration mechanism
- **An outlet for offloading to Web Workers** is not placed. When one is placed, its home is `capabilities`

### The Shape That Shows the Impact Range Before Execution

**If you adopt the shape "query the server for the impact range before executing, show it, then execute", follow the line of
"Copies of judgments the server owns" above** — the fetched count is not used for judgment, and the server settles the population.

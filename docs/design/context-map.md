# Map of Touchpoints

This page lays out on one sheet **where this presentation layer touches the outside**, and records only two things per edge —
**boundary ownership** (who decides the contract) and **whether it translates** (whether a layer sits in between that maps the other side's vocabulary onto ours).

## Why the two axes are kept apart

The two **are decided in different ways**. Mix them, and the one that cannot be decided gets dragged along by the one that can,
and labels with no basis end up in the table.

- **Whether it translates is decided by the machine.** The wire types generated from the contract live in the `adapters-gen` zone of `architecture.ts`,
  and only `adapters` can reach them. So the generated types are always mapped before they leave `adapters` —
  the dependency table holds this fact, and there is no room for human judgment
- **Boundary ownership does not come out of the machine.** "Can we negotiate with this party, or can we only follow it?" is an organizational fact,
  and no amount of reading the code settles it. **What this table records is that fact as a human answered it**, and
  the audit checks only "does the record disagree with what is actually there?"

**The relationship vocabulary (Customer-Supplier / Conformist and the like) is not used.** This presentation layer has no domain layer
and does not claim alignment with DDD ([`docs/project/out-of-scope.md`](../project/out-of-scope.md)). When the same thing
can be said with the two words "ownership" and "translation", imported vocabulary is only a burden on the reader.

## Outgoing Edges

| Party | Boundary ownership | Translation | Contract source | Document that holds the mechanism |
| --- | --- | --- | --- | --- |
| **Backend** | The other side (it defines its own) | **Yes** — wire types are mapped to display types before they leave `adapters` | Its own contract (OpenAPI / GraphQL) | [`data-fetching.md`](data-fetching.md) |
| **IdP** | The other side (follows the OIDC standard) | **Yes** — the assertion received is resealed into this side's session | OpenID Connect | [`auth.md`](auth.md) |
| **Observability backend** | The standard (OTel) | **No** — sent as OTLP unchanged | OpenTelemetry | [`observability.md`](observability.md) |
| **Media origin** | The other side | **No** — it only builds URLs | The origin's URL conventions | [`security.md`](security.md) / [0045](../adr/0045-fonts-and-images.md) |
| **Tag manager** (optional) | The other side | **No** — it holds only the endpoint that loads it | The vendor's embedding spec | [`security.md`](security.md) / [0131](../adr/0131-cookie-consent.md) |

## Incoming Edges

| Party | Boundary ownership | Translation | Contract source | Document that holds the mechanism |
| --- | --- | --- | --- | --- |
| **Callers of `/api/*`** | **This side** — this repository decides the endpoint's shape | **Yes** — the received shape is validated before it becomes an internal type | This repository | [`data-fetching.md`](data-fetching.md) / [`observability.md`](observability.md) |
| **Crawlers and indexes** | The standard (robots / sitemap / OG) | **No** | Each spec | [0044](../adr/0044-seo-metadata-strategy.md) |

**Only the relay endpoints split on ownership.** Even under the same `/api/*`, there are endpoints whose shape this side decides, and
endpoints that validate only the envelope and forward it without reinterpreting it. Which one is which is held column by column in
[the relay endpoint table in `observability.md`](observability.md), so it is not copied here.

## What This Table Does Not Hold

- **The mechanism of each edge.** How to connect, what to send and how to fold failures belong to the "document that holds the mechanism" in the tables above.
  If this page held them, two places would go stale at once whenever an edge is added
- **Configuration values.** Where each endpoint lives is held by the purpose-scoped modules in `src/config/`, which are authoritative
  ([0030](../adr/0030-environment-variable-management.md))
- **Whether the other party actually exists.** This table lists **the shapes of contact**.
  Which parties are actually connected depends on the use case

## When an Edge Is Added

**When a new external endpoint is added, add a row to this table.** Otherwise `context-map-audit` picks it up as
"a touchpoint exists but has no edge" — it can pick that up only once the endpoint appears on the implementation side, so
**it can detect the gap only in the form of the table going stale first**.

When adding a row, **read whether it translates from the dependency table.** Ownership cannot be read, so **ask a human.**
The code holds no answer to "can we negotiate with this party?".

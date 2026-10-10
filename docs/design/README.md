# Design Reference

This directory holds **design explanations** per topic. Each one gathers, on a single page, a topic's role, how it came to be, where it is implemented, and where it is easy to get wrong.

## What Goes Here and What Does Not

It does not replace the per-layer READMEs. Where a README is the entry point to one layer, a page here explains **one topic that cuts across layers** from end to end.

| Kind | Location |
| --- | --- |
| Choosing among options, and deliberate decisions not to do something | [`docs/adr/`](../adr/) |
| Constraints enforced day to day | [`docs/rules.md`](../rules.md) |
| Each layer's responsibilities and what it accepts | each layer's `README.md` |
| **Design explanations per topic** | **here** |

The decision itself belongs to the ADR. What a page here holds is the background needed to read that decision, and an explanation written after reading the implementation. When the two disagree, the ADR wins ([ADR 0140](../adr/0140-documentation-operations.md)).

## Documents

| Document | Topic | Scope |
| --- | --- | --- |
| [rendering.md](rendering.md) | Rendering | The terms Server / Client Component, SSR, hydration and Server Action, and what happens when they are confused |
| [placement.md](placement.md) | Placement | Where to put display, hooks and client state. The order of the decision, and where the lookup is easy to get wrong |
| [design-system.md](design-system.md) | Design system | How tokens build up to components, how regions are divided, taking in upstream components, stacking order, the catalog |
| [forms.md](forms.md) | Input and submission | From the input field to the Server Action and how the result is shown. The tree each of the three hooks looks at, and who holds the value |
| [data-fetching.md](data-fetching.md) | Fetching and contracts | From the contract to generated artifacts, and from generated artifacts to display types. The fetch wrapper, error normalization, and the classification gate |
| [auth.md](auth.md) | The front side of authentication | The line of responsibility that relays but does not verify, how the session is held, where protection applies, the development endpoint |
| [security.md](security.md) | Defense | Delivery headers and CSP, data classification, the `NEXT_PUBLIC_` boundary, what entry points hold |
| [observability.md](observability.md) | Observability | How the two kernels divide the work, how one trace connects, the relay endpoint, rendering instrumentation |
| [realtime-delivery.md](realtime-delivery.md) | Subscription and delivery | The shape for giving the subscription seam, which **has no implementation yet**, a real one. From ticket issuance to ordering and reconnection, which layer holds what |
| [vrt.md](vrt.md) | Pinning the visuals | What baseline images protect and what they do not. How to stop flakiness |
| [context-map.md](context-map.md) | Map of touchpoints | The list of places that touch the outside, and per edge who owns the boundary and whether it translates. The mechanisms live in each topic's document; this one only points to them |

## How to Read This

Each topic stands on its own. There is no need to read all of them; read only the one for the topic you are touching now.

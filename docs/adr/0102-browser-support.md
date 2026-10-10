# Browser Support Matrix

Defines the supported browsers' **baseline (browserslist) / polyfill policy / cut-off conditions**.

## Status

Accepted

## Context

The lower bound of support depends on the use case. This repository holds only a default that assumes modern browsers; tightening / relaxing is done on the use-case side.

## Decision

### 1. Baseline = ratify Next.js's default browserslist

- The support target **ratifies the browserslist Next.js uses by default** (modern browsers; following Next.js 16's transpilation / polyfill defaults). This repository does not hold its own wide backward-compatibility target
- Overriding `browserslist` (or the Next.js config) according to requirements is not prevented

### 2. Polyfill policy

- **Delegate to Next.js's default polyfills** (Next.js automatically injects only widely used polyfills such as fetch / URL / Object.assign; polyfills needed for features outside the target are added yourself = Custom Polyfills). Our own polyfills are not added pre-emptively (out of scope under the role definition of [0011](0011-no-docker.md) + only once needed)

### 3. Cut-off conditions

- The concrete lower bound of support (the cut-off line for legacy browsers) **depends on the use case**, so it is not decided here. This repository defaults to assuming modern browsers
- **Environments without JavaScript are supported only on the paths for reading and navigating.** Browsing a list, displaying conditions carried in the URL, and navigation work without JavaScript. On the other hand, an operation that assembles conditions and then commits them together needs to hold state on the browser side, and is incompatible with a form that can be submitted without JavaScript — to avoid only some of the in-progress conditions taking effect first and swapping the list, the former is adopted and submission without JavaScript is dropped

## Prohibitions

- ❌ Pre-emptively adding our own polyfills / a wide backward-compatibility target (delegate to Next.js defaults, add when needed) (Enforcement: none — a decision not to adopt. Neither our own polyfills nor a browserslist override is placed in the tree, and a change adding them appears in the diff as added files or settings)

## Related ADRs

- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — Next.js build / transpilation assumptions
- [0011-no-docker.md](0011-no-docker.md) — a presentation layer with an undetermined use case (grounds for not defining cut-off conditions here)
- [0101-performance-budget.md](0101-performance-budget.md) — where targets intersect with bundle / performance

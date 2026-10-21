# SEO / Metadata Strategy

This ADR defines this repository's conventions for **the metadata system (App Router Metadata API) / crawler control (`sitemap.ts` / `robots.ts`) / canonical and alternates / structured data (JSON-LD) / the icon system / inspecting the public surface**. It ratifies the Metadata mechanism built into Next.js 16 and lays down minimal operating rules. Concrete values (title wording, URL lists, schema.org types) are use-case dependent and are not defined here.

## Status

Accepted

## Context

[0045](0045-fonts-and-images.md) (fonts and images) treats dynamic OG images (`ImageResponse` / `opengraph-image`) and the favicon in `public/` **as means of generating image assets**. **The metadata system**, including head elements, crawler control, canonical and structured data, **is a separate axis**, and this ADR holds it.

Having checked `node_modules/next/dist/docs/` before implementation, the following exist as first-class file conventions / APIs in Next.js 16 (AGENTS.md "Canonical Documentation"):

- **Metadata API**: declaring a static `metadata` export or a dynamic `generateMetadata` in a route segment makes Next.js generate `<head>` elements automatically
- **File-based metadata**: `sitemap.(xml|ts)` / `robots.(txt|ts)` / `icon.*` / `apple-icon.*` / `manifest.*` / `opengraph-image.*`, etc. directly under `app/`. As special Route Handlers they are cached by default (except when request-time APIs / dynamic config are used)
- **Large sitemaps**: generated in parts with `generateSitemaps`
- **Intersection with Proxy (important)**: the docs state explicitly "when used together with `proxy.ts`, exclude metadata files from Proxy". This is the intersection with `proxy.ts` ([0043](0043-middleware-policy.md))

## Decision

### 1. Metadata = App Router Metadata API by default

- Head metadata (title / description / OpenGraph / Twitter / robots meta, etc.) is declared with **the App Router's Metadata API**. **Do not hand-write `<head>` or use `next/head`**
  - Use a **static `metadata` export** for what is determined statically, and **`generateMetadata`** for what depends on the request / parameters
- The root (`src/app/layout.tsx`; placement per [0027](0027-directory-structure.md)) holds **the default base of `metadataBase` and `title.template` (the site-wide title template)**. Each segment declares only its difference from it (avoiding duplicate definitions)
- **Absolute URLs have a single origin, config (`SITE_PUBLIC_ORIGIN`), and are never taken from the request's `Host`.** The absolute URLs of canonical / sitemap / OG images are all built by appending a path to this origin. With a serving surface (CDN / load balancer) in between, the host a request claims no longer matches the public name, and taking it from `Host` would serve a canonical that points at someone else
- Concrete title wording, descriptions and OG image assignments are **use-case dependent**, so only the template frame is held here and the values are settled in the feature implementation

### 2. Crawler control = `sitemap.ts` / `robots.ts` (Next.js conventions)

- The sitemap is generated with **`app/sitemap.(xml|ts)`** and crawler control with **`app/robots.(txt|ts)`**, following the Next.js conventions (no static files placed our own way, no hand-written XML generation). When there are many URLs, split with **`generateSitemaps`**
- **Concrete contents** such as included URLs, `Disallow` paths and `changefreq` are **use-case dependent** (subordinate to the route structure), so they are not settled here. This repository defines the mechanism (the policy of using these file conventions)
- **Whether indexing is allowed is declared by the environment** (`SITE_INDEXABLE`; [0030](0030-environment-variable-management.md)). In an environment without the declaration, `robots.txt` refuses crawling and screens emit `noindex`. Only the side that allows indexing states it explicitly
- **If the sitemap walks a list to its end, the walked result is kept across requests** (`use cache`; ownership and lifetime conventions are [0071](0071-bff-api-integration.md)). Crawlers open the same URL repeatedly, and walking on every open inflates one request into as many backend calls as the list has items
- **Metadata routes degrade partially.** Even if fetching a dynamic list fails, they return what was fetched plus the static routes that do not depend on the backend. Turning the whole thing into a 500 on one failing source would keep crawlers from learning even that the static screens exist

### 3. canonical / alternates

- The canonical URL and language alternates are declared with the Metadata API's **`alternates.canonical` / `alternates.languages`** (no hand-written `<link rel="canonical">`). i18n alternates ride on this seam when [0121](0121-i18n-strategy.md) is adopted

### 4. Structured data (JSON-LD)

- Structured data (schema.org / JSON-LD) **may be adopted** and is embedded in the implementation of the features that need it (as Next.js recommends, rendering a JSON-LD `<script type="application/ld+json">` inside a component). **Adoption and schema.org types are use-case dependent**, so this repository does not fix the types and shows only the frame

### 5. Icon system (division of roles between `icon.*` / `apple-icon.*` and the `public/` favicon)

- **Generated / multi-resolution icons use the Next.js metadata file conventions** (`app/icon.*` / `apple-icon.*`). **A simple static favicon goes in `public/`** ([0045](0045-fonts-and-images.md)). This ADR states the division of roles explicitly (0045 covers "the favicon as an image asset", this ADR "icons as part of the metadata system")

### 6. Intersection with Proxy

- `proxy.ts` ([0043](0043-middleware-policy.md)) **excludes metadata files (`sitemap` / `robots` / `icon` / `opengraph-image`, etc.)** (the Next.js good-to-know; so that Proxy does not intercept the serving of metadata). The exclusion is done with the `matcher` of `proxy.ts`, and gaps in what the matcher selects are caught by e2e ([0043](0043-middleware-policy.md))

### 7. Inspecting the public surface checks "does it work", not "does it exist"

- Metadata **does not break the screen even when its contents are broken**, so ordinary tests and review do not notice. With only existence checks, an empty `sitemap.xml`, a canonical pointing at someone else and an OG image that fails at runtime all pass green
- Therefore, against the public surface built with indexing allowed, e2e (`make e2e-metadata`) confirms the following:
  - `robots.txt` allows crawling
  - The URLs `sitemap.xml` lists exist (it lists no 404s), and each page's canonical points at itself
  - `icon` / `opengraph-image` return as images (`ImageResponse` can fail at runtime even after passing the build)
- The non-indexing side (`noindex` / crawl refusal) is checked by the ordinary e2e. Only by looking at both sides is "it switches by environment" confirmed

## Responsibility Boundaries (Division from 0045)

| Concern | Where it lives |
| --- | --- |
| Metadata system (head elements, title.template, metadataBase, canonical, robots meta) | **This ADR (0044)** |
| Crawler control (`sitemap.ts` / `robots.ts`), structured data | **This ADR (0044)** |
| **Means of generating** dynamic OG images (`ImageResponse` / `opengraph-image`) | [0045](0045-fonts-and-images.md) (this ADR covers "which OG to assign" = the Metadata side) |
| Placing the static favicon in `public/` | [0045](0045-fonts-and-images.md) (this ADR covers the generated / multi-resolution icon conventions) |

## Prohibitions

- ❌ Hand-writing `<head>` / using `next/head` (use the Metadata API) (Enforcement: biome `noHeadElement` rejects `<head>` outside `app/`. `<head>` inside `src/app` and imports of `next/head` are Prose — **mechanizable** (the form that rejects `next/head` with `no-restricted-imports` and `<head>` JSX with `no-restricted-syntax`; no rule exists))
- ❌ Defining the same metadata redundantly in several places (declare differences on top of the root's `title.template` / `metadataBase`) (Enforcement: Prose — **not mechanizable**. Whether something is a difference or a duplicate is decided by the meaning of the values, not by the shape of the declaration)
- ❌ Building absolute URLs from the request's `Host` (the single origin is the public origin in config) (Enforcement: `src/app/layout.test.tsx` and `src/app/sitemap.test.ts` pin `metadataBase` and the sitemap to the config origin. A new place that builds absolute URLs reading `Host` is Prose — **mechanizable** (the form that rejects expressions reading `host` / `x-forwarded-host` from `headers()` in the metadata paths of `src/app`; no rule exists))
- ❌ Implementing `sitemap` / `robots` with static placement or hand-written generation of our own (use the Next.js file conventions `app/sitemap.ts` / `app/robots.ts`) (Enforcement: `src/app/robots.test.ts` / `src/app/sitemap.test.ts` and `make e2e-metadata` confirm the output of the file conventions. Placing a static `robots.txt` / `sitemap*.xml` in `public/` is Prose — **mechanizable** (the form where a gate checks that those names do not exist under `public/`; no rule exists))
- ❌ Placing a hand-written `<link rel="canonical">` (use `alternates.canonical`) (Enforcement: Prose — **mechanizable** (the form that rejects JSX `<link rel="canonical">` with ESLint `no-restricted-syntax`; no rule exists))
- ❌ Letting `proxy.ts` catch metadata files (exclude them from Proxy) (Enforcement: Prose — **mechanizable** (the form where a unit test builds `config.matcher` of `src/proxy.ts` as regular expressions and checks that metadata file paths do not match; no check exists))
- ❌ Settling for existence checks when inspecting the public surface (§7)
- ❌ Returning the whole `sitemap` as 500 when fetching a dynamic list fails (§2; do not bring the static routes down with it) (Enforcement: `src/app/sitemap.test.ts` (pins that the static routes are returned even when fetching the list fails))
- ❌ Fixing use-case-dependent concrete values (title wording, included URLs, JSON-LD types) here (frame only, no values) (Enforcement: none — a decision not to adopt. Not having title wording, included URLs or JSON-LD types in this ADR is itself the state)

## Related ADRs

- [0045-fonts-and-images.md](0045-fonts-and-images.md) — OG image generation / the `public/` favicon (shares responsibility boundaries with this ADR)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the foundation of the App Router / Metadata API / special files
- [0028-naming-convention.md](0028-naming-convention.md) — naming of special files such as `sitemap` / `robots` / `opengraph-image`
- [0030-environment-variable-management.md](0030-environment-variable-management.md) — supply of the public origin and whether indexing is allowed (`SITE_PUBLIC_ORIGIN` / `SITE_INDEXABLE`)
- [0043-middleware-policy.md](0043-middleware-policy.md) — the intersection where `proxy.ts` excludes metadata files
- [0091-test-verification-methods.md](0091-test-verification-methods.md) — why e2e bears the inspection of the public surface
- [0121-i18n-strategy.md](0121-i18n-strategy.md) — language alternates (ride on this ADR's canonical/alternates seam when i18n is adopted)
- [0101-performance-budget.md](0101-performance-budget.md) — metadata / OG tie directly into SEO and the sharing experience

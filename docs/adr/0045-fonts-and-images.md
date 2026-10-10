# Fonts and Images

This ADR defines the conventions for fonts and images: **how to use `next/font` / `next/image` / how `public/` is handled / dynamic OG images**. It ratifies the mechanisms built into Next.js and lays down minimal operating rules.

## Status

Accepted

## Context

How to use `next/font` / `next/image`, how `public/` is handled, and dynamic OG images are all areas where Next.js has built-in mechanisms. This ADR defines the policy of making those built-in mechanisms the default, and brings in no alternatives of our own.

## Decision

### 1. Fonts = `next/font`

- Web fonts are loaded with **`next/font`** (self-hosting, layout-shift suppression, `preload`). Avoid loading directly from an external CDN or writing `@font-face` by hand
- Font definitions are applied from `src/app/layout.tsx` (the root) as the base point ([0027](0027-directory-structure.md)). The definitions themselves are extracted to the same level, and **the catalog (Storybook) reads the same definitions too**. Writing them twice makes only the catalog display in the plain typeface, and baseline images no longer match the real thing
- **The roles of typefaces (body / display / monospace) are held by the semantic layer of design tokens** ([0051](0051-styling-system.md)). The variables `next/font` hands out are received as primitives that express identity, and components reference only the role names. **The Japanese body typeface is not held as a web font but left to the typefaces bundled with the OS** ([0051](0051-styling-system.md)). The mechanism for switching per family (`data-surface`) remains, but the body typeface is not part of that axis

### 2. Images = `next/image`

- Raster images use **`next/image`** (optimization, lazy loading, layout-shift suppression). Raw `<img>` is not used as a rule (exceptions such as decorative SVG are allowed)
- The image-optimization loader is chosen according to the delivery premise ([0011](0011-no-docker.md)) (whether the PaaS's built-in optimization or a loader for static export is decided by the deployment target)

### 2.1 Backend-originated images = public storage assumed, no serving layer of our own

- What the backend returns is an **object key** (e.g. `{resource}/{uuid}.{ext}`), and **assembling the display URL is the frontend's responsibility** (the backend is not made to store full URLs)
- Storage is assumed to be **public storage** (anonymous read allowed / listing not allowed). Therefore this repository **places no serving proxy (Route Handler)**. What it holds is only a pure function that prefixes the serving origin (`mediaUrl()`) and `images.remotePatterns` in `next.config.ts`; `next/image` alone handles optimization
- The serving origin is supplied by env (`MEDIA_ORIGIN`) ([0030](0030-environment-variable-management.md)). The same origin is registered in **both** `remotePatterns` and the CSP `img-src` ([0111](0111-csp-security-headers.md)), and **no wildcard is used**
- **`mediaUrl()` is confinement, not prefixing the origin.** Keys arrive unvalidated, so a value that carries its own scheme, such as `data:`, slips past the prefix and points outside the serving origin. `next/image` takes values with a scheme off the optimization path, so the `remotePatterns` allowance has no effect on this path. **If the assembled URL does not fall under the serving origin, no display URL is produced** (it falls back to a substitute image)
- **The serving host must be resolvable by the host running Next.js, not by the browser.** `next/image` optimization is **a server-side fetch**, so name resolution is not settled on the browser side. If a name that only browsers and some OSes resolve on their own, such as `*.localhost`, is taken as the serving origin, it does not resolve in glibc Linux containers or CI, and images fail to appear only there. If you take one, also provide resolution on the execution host side
- If private objects need to be handled, issuing signed URLs is the backend's responsibility (the same shape as [0075](0075-file-upload-seam.md)). It is not solved by growing a serving layer on the frontend
- **No blur placeholder (`blurDataURL`) is put in the ordinary API contract** — backend-originated images would need it supplied by us, and list responses would bloat by the number of items. `MediaImage` does not prevent usage that explicitly passes `next/image`'s standard `placeholder` / `blurDataURL` (including static imports). Meanwhile, the default is loading via **a fixed aspect ratio + CSS Skeleton** in the `components` kernel, which needs no `"use client"`. Images that become the LCP (the top of a list, the main image of a detail page) specify `preload` and do not put a Skeleton in between

### 3. Handling `public/`

- `public/` is the home of **static assets (favicon / decorative images / static files)** (one of the few paths outside the source root where [AGENTS.md](../../AGENTS.md) AI Modification Scope permits additions). It is limited to what is served without a build
- For images tied to a component, **static import and passing to `next/image`** is recommended (width, height and `blurDataURL` are determined automatically, feeding CLS prevention). Passing a `public/` path string to `next/image` is still optimized, but `width` / `height` must be specified by hand. A direct-link reference that does not go through `next/image` gets no optimization

### 4. Dynamic OG images

- Dynamic OG images are generated with Next.js's **`ImageResponse` (the `opengraph-image` special file)** (special-file naming of [0028](0028-naming-convention.md)). Metadata in general is handled with the App Router Metadata API, owned by [0044](0044-seo-metadata-strategy.md)

## Prohibitions

- ❌ Loading web fonts by direct reference to an external CDN / a hand-written `@font-face` (use `next/font`) (Enforcement: the CSP `font-src 'self'` and the E2E `securitypolicyviolation` watch reject loading from external CDNs. A hand-written `@font-face` served by ourselves is Prose — **mechanizable** (the form where a gate rejects `@font-face` in `src/**/*.css`; no rule exists))
- ❌ Using raw `<img>` for raster images (`next/image`; decorative SVG and the like are exceptions) (Enforcement: biome `noImgElement` (next domain; `--error-on-warnings` rejects raw `<img>`))
- ❌ Placing files that need a build / must be kept secret in `public/` (static public assets only) (Enforcement: gitleaks (the `gitleaks` workflow and `make secret-scan`) rejects secret-shaped values, including in `public/`. Files that need a build are Prose — **mechanizable** (the form where a gate checks the extensions under `public/` against an allow list; no rule exists))
- ❌ Building a serving path of our own for backend-originated images (a Route Handler proxy such as `/cdn`) (§2.1; covered by public storage + `next/image`) (Enforcement: none — a decision not to adopt. Not having a Route Handler for serving images is itself the state; adding one shows up in the diff as the addition of a `route.ts`)
- ❌ Registering a wildcard origin in `images.remotePatterns` (serving origins are enumerated explicitly) (Enforcement: Prose — **mechanizable** (the form where the `MEDIA_ORIGIN` validator rejects values whose host contains `*`; no check exists))

## Related ADRs

- [0044-seo-metadata-strategy.md](0044-seo-metadata-strategy.md) — SEO / metadata strategy (owner of OG images and metadata; shares responsibility boundaries)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — App Router / Metadata API / special files
- [0027-directory-structure.md](0027-directory-structure.md) — placement of `src/app/` / `public/`
- [0028-naming-convention.md](0028-naming-convention.md) — special-file naming such as `opengraph-image`
- [0011-no-docker.md](0011-no-docker.md) — delivery premise (choosing the image-optimization loader)
- [0051-styling-system.md](0051-styling-system.md) — typeface roles (semantic layer) and the handling of the Japanese body typeface
- [0101-performance-budget.md](0101-performance-budget.md) — fonts / images tie directly into CWV (LCP / CLS)

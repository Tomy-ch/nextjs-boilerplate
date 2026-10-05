# PWA Strategy (Exclusion)

Records **not bundling** a PWA (Progressive Web App) — **Web App Manifest / Service Worker / offline support** — as a deliberate exclusion, and shows only the seams on Next.js for when one is adopted.

## Status

Accepted (exclusion)

## Context

A use-case-dependent "not doing it" judgment, left silent, leaves no trace that the line was drawn consciously. As with i18n ([0121](0121-i18n-strategy.md)), PWA is also made explicit as an exclusion.

Next.js has a file convention for the Web App Manifest (`app/manifest.(json|ts)`), but a Service Worker / offline cache is not something Next.js builds in automatically; it needs its own implementation (or an external library). Whether a PWA is useful **depends heavily on the delivery model, offline requirements and whether installability is needed**. No seam is placed as code; what this ADR records is **the coordinates of the extension points for when it is adopted**.

## Decision: Not Bundled (Use-Case Dependent)

- **No Web App Manifest / Service Worker / offline cache / install prompt (A2HS) is bundled**. It depends on the use case, so it is decided when it becomes necessary (Enforcement: none — a decision not to adopt. No Web App Manifest or Service Worker is bundled, and a change adding them shows up in the diff as added files and dependencies)
- Derivation: the "presentation layer whose use case is undecided" role of [0011](0011-no-docker.md) — the core does not pre-empt use-case-dependent judgments (the same logic as [0121](0121-i18n-strategy.md))
- **When it is adopted, a local library (Serwist(`@serwist/next`)) is placed at the seams below.** Even then the core keeps the seams, and the library is placed within the bounds of [0010](0010-standards-and-non-lockin.md) (vendor-independent justification / replaceable behind the adapters and kernel boundaries / no direct vendor references scattered across features and components) and [0004](0004-library-management.md) (exact pin / `pnpm audit`)
- **Seams when a PWA is adopted** (for reference):
  - The Web App Manifest is generated with Next.js's **`app/manifest.(json|ts)`** file convention (connected to the icon scheme of [0044](0044-seo-metadata-strategy.md); icons are `app/icon.*` / `apple-icon.*`)
  - The Service Worker / offline cache has no automatic Next.js integration, so it is implemented in-house. Using an external library likewise stays within the bounds of [0004](0004-library-management.md) (exact pin / `pnpm audit`) and [0021](0021-frontend-responsibility.md) (kernel placement, naming discipline)

## Handling Exclusions

- This ADR records a "deliberately not doing it" judgment ([0140](0140-documentation-operations.md) taxonomy: exclusion = ADR). This exclusion is no obstacle to introducing it

## Related ADRs

- [0011-no-docker.md](0011-no-docker.md) — the role of a presentation layer whose use case is undecided (the basis for treating it as use-case dependent)
- [0121-i18n-strategy.md](0121-i18n-strategy.md) — the same kind of judgment, recording a use-case dependency as an exclusion
- [0044-seo-metadata-strategy.md](0044-seo-metadata-strategy.md) — the `manifest.*` / icon-scheme seams (when adopted)

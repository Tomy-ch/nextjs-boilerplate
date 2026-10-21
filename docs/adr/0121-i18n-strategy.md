# i18n Strategy (Exclusion)

Records **not bundling** an internationalization (i18n) library, locale resolution or a translation-key design as a deliberate exclusion, and shows only the seams on the App Router for when one is adopted.

## Status

Accepted (exclusion)

## Context

i18n **depends heavily on the use case — which locales are needed and how translation is operated** — so deciding it uniformly here would narrow the choice. No library is bundled; what this ADR records is **the coordinates of the extension points for when it is adopted**.

## Decision: Not Bundled (Use-Case Dependent)

- **No i18n library (next-intl, etc.), locale resolution or translation-key scheme is bundled**. It depends on the use case, so it is decided when it becomes necessary (Enforcement: none — a decision not to adopt. No i18n library, locale resolution or translation keys are bundled, and a change adding them shows up in the diff as added dependencies and files)
- Derivation: the "presentation layer whose use case is undecided" role of [0011](0011-no-docker.md) — the core does not pre-empt use-case-dependent judgments
- **When it is adopted, a local library (next-intl) is placed at the seams below.** Even then the core keeps the seams, and the library is placed within the bounds of [0010](0010-standards-and-non-lockin.md) (vendor-independent justification / replaceable behind the adapters and kernel boundaries / no direct vendor references scattered across features and components) and [0004](0004-library-management.md) (exact pin / `pnpm audit`)
- **Seams when i18n is adopted** (for reference): Next.js practice is to resolve the locale on the App Router in **`proxy.ts` (locale detection and redirects; [0043](0043-middleware-policy.md))** and in **a route segment (`[locale]`; [0040](0040-routing-rendering-strategy.md) / [0028](0028-naming-convention.md))**. Introducing it likewise stays within the bounds of [0021](0021-frontend-responsibility.md) (kernel placement, naming discipline) and [0004](0004-library-management.md) (exact pin / audit)
- **Formatting of dates and numbers and date arithmetic**, needed from day one even with a single locale, **are outside the reach of this ADR** and are owned by [0120](0120-locale-aware-formatting.md). 0120's seam, which consolidates the default locale in a single `model` constant, becomes the replacement point that receives the active locale from the seams above once i18n is adopted

## Handling Exclusions

- This ADR records a "deliberately not doing it" judgment ([0140](0140-documentation-operations.md) taxonomy: exclusion = ADR). This exclusion is no obstacle to introducing it

## Related ADRs

- [0011-no-docker.md](0011-no-docker.md) — the role of a presentation layer whose use case is undecided (the basis for treating it as use-case dependent)
- [0043-middleware-policy.md](0043-middleware-policy.md) / [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the locale-resolution seams (when adopted)
- [0120-locale-aware-formatting.md](0120-locale-aware-formatting.md) — ownership of `Intl` formatting and `date-fns` arithmetic / the default-locale seam
- [0130-pwa-strategy.md](0130-pwa-strategy.md) — the same kind of judgment, recording a use-case dependency as an exclusion

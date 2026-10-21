# Accessibility Target

Defines accessibility's **target level (WCAG) / static checks (biome a11y) / timing of manual checks**.

## Status

Accepted

## Context

Defines **the minimal a11y policy** this repository meets (WCAG level, use of biome a11y rules, timing of manual checks). Making it stricter depends on the use case and is not defined here.

## Decision

### 1. Target level = WCAG 2.x AA

- The level this repository aims for is **WCAG 2.x level AA** (the industry-standard default level). Raising it to AAA according to requirements is not prevented

### 2. Static checks = biome's a11y rules

- **Use biome's a11y rule set** ([0002](0002-formatter-linter.md); biome handles static a11y lint). It is enforced in CI with `lint:ci`, the full profile ([0002](0002-formatter-linter.md))
- **Automated checks** such as ARIA consistency in the runtime DOM and measured contrast are handled by axe (`vitest-axe` / `@axe-core/playwright`), adopted by [0091](0091-test-verification-methods.md) (division of roles: biome is static lint, axe is runtime DOM checking)
- **The same runtime checks are applied in the UI catalog too** ([0054](0054-ui-catalog-storybook.md)). This is because the catalog's canvas holds, in a real browser, states involving layout, focus and scrolling that jsdom does not reproduce in tests. **The catalog's stories having zero violations is included in the conditions for calling that component "done"**
- Among the findings that automated checks fall back to "needs review", **those the checker is known to be structurally unable to decide** are not chased again. The reason it cannot decide, and what was pinned in tests instead, are recorded in the component's README. Treating violations and incomplete ("needs review") the same leaves untraceable findings permanently, and the check as a whole stops being read
- Manual checks are limited to experiential aspects that cannot be mechanized by these (screen reader experience, etc.)

### 3. Timing of manual checks

- Keyboard operation / focus order / screen reader checks are done **at the implementation PR of a feature that involves UI** (the viewpoint of experiential aspects that cannot be automated). The range that can be mechanized, such as ARIA consistency and measured contrast, is mechanized with axe ([0091](0091-test-verification-methods.md)) / E2E ([0090](0090-testing-strategy.md) Playwright)
- **Components in `components` are checked per component, without waiting for a feature.** `components` has no business context, so the states a component itself expresses (variant / disabled / invalid / open-closed, etc.) are settled before any feature appears. Pushing the check back to that point means repeating the same check for every feature that uses the same component
- Semantic HTML is the default, built on the foundation that the pure UI of `components` ([0021](0021-frontend-responsibility.md)) is accessible

## Prohibitions

- ❌ Disabling biome's a11y rules without reason (the prohibition of biome-ignore abuse in [0002](0002-formatter-linter.md)) (Enforcement: Prose — **partly mechanizable**. Setting a11y rules to `off` in `biome.json` and the spelling `biome-ignore lint/a11y/` can be picked up statically, but no rule exists. Whether the reason for disabling is valid is a human judgment)
- ❌ Detaching a11y from feature implementation as "handle later" (guaranteed at implementation-PR time) (Enforcement: the `a11y` job (required; its existence is checked by `make actions-required-check-lint`) runtime-checks every story, and the scaffold places `axe()` at generation time. Keyboard operation and screen reader checks are Prose — **not mechanizable**. They are checks of experience and do not appear in code)

## Related ADRs

- [0002-formatter-linter.md](0002-formatter-linter.md) — biome a11y rules (the means of static checking)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — pure UI in `components` (the foundation of accessibility)
- [0091-test-verification-methods.md](0091-test-verification-methods.md) — building in runtime automated a11y checks = axe (`vitest-axe` / `@axe-core/playwright`) (this ADR's means of automated checking)
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — UI catalog (the surface where real-browser a11y checks are applied per component)
- [0051-styling-system.md](0051-styling-system.md) — respecting `prefers-reduced-motion` (WCAG SC 2.3.3 = AAA level; the grounds for making it mandatory independently of the AA target are held by 0051)
- [0090-testing-strategy.md](0090-testing-strategy.md) — E2E (a11y checks that can be mechanized)
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind (connected to design tokens such as contrast)

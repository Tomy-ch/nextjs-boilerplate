# The docs-viewer Package Boundary

This project places the documentation portal's viewer (`docs-viewer/`) as a workspace package separate from the application itself, sharing no dependencies. The viewer references the application's source, but the application cannot reach the viewer. **This separation is guaranteed by a package boundary, not by a rule.**

[0141](0141-portal-operations.md) owns the portal's manifest, generation and delivery, and goes as far as stating that the viewer is an independent package. What this ADR owns is what that boundary separates, what it does not separate, and what protects it.

## Status

Accepted

## Rationale / Purpose

- **The tolerated range of sanitization differs.** What the application passes through its sanitizer is content users post, and the allowlist of `src/model/rich-text` lets through neither `table` nor `pre` nor the `class` attribute. What the viewer renders is committed documents the repository itself holds, and it is useless if it cannot show tables, code blocks and diagrams. With a wide and a narrow allowlist side by side in the same package, only a rule would stop the application from importing the wide one
- **Separate the supply surface.** The dependencies the viewer pulls in (Markdown conversion, diagram rendering, search) do not land in the application's dependency list. They appear neither in the application's bundle nor in the set audited as the application's dependencies
- **Give the design system a real user.** The viewer is the first user of the components outside Storybook, with real data volumes, real document lengths and real combinations. A copy cannot play this role

## An independent workspace package

- The `packages` of `pnpm-workspace.yaml` list the application itself (`.`) and `docs-viewer` side by side, and the viewer has its own `package.json`
- It is built with Vite, does not run on the Next.js runtime, and builds on its own as a static site. **It uses no Next.js-specific API (`next/link` / `next/image` / Server Components)**
- It has no path prefix for where it is delivered (`base: "./"`). The portal's URL is decided by the delivery side ([0141](0141-portal-operations.md))

## Dependencies point one way

**Only viewer → application is allowed.**

- The viewer references the application's `src/` directly through the `@` alias and uses the design-system components as they are. It does not copy them — once a copy drifts, the purpose of validating the design system in real use is lost
- Icons too are taken from the same public surface as the application (`src/components/icon.ts`). If the viewer side could name the supplier, there would be two places in the workspace that name it ([0052](0052-ui-component-policy.md))

**There is no application → viewer.** What protects this is not a rule but the following three things.

1. **The wide allowlist lives in `docs-viewer/src/`.** `@/` resolves to `src/`, which cannot reach it
2. **The boundary check on `src/` rejects dependencies that point outside the declared elements** (`boundaries/no-unknown-dependencies` — [0021](0021-frontend-responsibility.md)). Crossing with a relative path still fails `lint:ci`
3. **Dependencies pulled in only by the viewer are not in the application's `package.json`.** Importing by package name does not resolve

## What is not separated

What the package split separates is dependencies and reachability, not quality gates.

- **Tests run in the same gate.** The viewer's tests go in the same Vitest suite as the application. A separate suite would allow a state where only one side is green, and CI's verdict would stop meaning "everything passed" ([0090](0090-testing-strategy.md))
- **Lint and type checking are also covered by the repository-root configuration.** Exceptions for the viewer are written inside the root configuration, scoped to their targets
- **The dependency cooldown and pinning of transitive dependencies apply uniformly to the whole workspace** (`minimumReleaseAge` / `overrides` in `pnpm-workspace.yaml` — [0110](0110-security-operations.md)). The viewer's dependencies are not on the application's supply surface, but they run in the browser within a published deliverable. That is no reason to exclude them from auditing

## The viewer's dependencies

- **Lean toward components that are self-contained.** For components that come in a pair with a `-native` / `-client` counterpart, prefer `-native` as far as the requirements allow
- **Pure logic (interpreting documents, filtering by language, search, routing) depends on nothing other than the validation library.** It is kept in a state where it can be taken out separately from rendering
- The `docs.json` the viewer reads is a generated artifact, and the viewer owns no source of the content ([0141](0141-portal-operations.md))

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Guarantee it by a rule** (write "do not import the viewer's sanitizer from the application") | Nothing stops a breaking import. A change that went unread in review passes as is |
| **Widen the allowlist of the application's sanitizer / switch it with an argument** | Posted content and the repository's own documents would go through the same path. A single switching argument would widen what is tolerated on the posting side |
| **House the viewer in the application as a Next.js route** | The viewer's dependencies would land on the application's supply surface. Delivery only needs to be static and needs no Next.js runtime |
| **Copy the design-system components into the viewer** | Once they drift, the role of validating in real use disappears |
| **Put the viewer's tests in a separate suite** | Only one side could be green |

## Prohibitions

- ❌ Importing `docs-viewer/` from `src/` (the direction is one way)
- ❌ Copying the viewer's allowlist into the application's sanitizer, or sharing it
- ❌ Putting dependencies used only by the viewer in the application's `package.json` (Enforcement: `knip` (the Dead Code workflow; rejects dependencies unused in the application's workspace))
- ❌ Copying design-system components into the viewer (Enforcement: Prose — **partly mechanizable**. Verbatim duplication between `docs-viewer/src/` and `src/components/` can be caught by duplicate detection, but no rule exists. Whether something is a modified copy is decided only by reading it)
- ❌ Using Next.js-specific APIs in the viewer (Enforcement: Prose — **mechanizable** (adding `next` / `next/*` to `no-restricted-imports` in the `docs-viewer/src/**` block of eslint.config.ts would reject them. No rule exists))
- ❌ Splitting the viewer's tests into a gate separate from the application's (Enforcement: the coverage gate measures `docs-viewer/src/**`, so moving only the tests into a separate suite fails on the threshold. A change that removes it from measurement altogether is Prose — **not mechanizable**. It shows up as a configuration diff, and a check forbidding it would only be a copy of the configuration)

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — pnpm (the workspace mechanism)
- [0004-library-management.md](0004-library-management.md) — choosing and pinning dependencies
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — machine enforcement of layer boundaries (the check that rejects crossings on the `src/` side)
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — the public surface for icons
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — component vocabulary (the viewer is a real user outside it)
- [0090-testing-strategy.md](0090-testing-strategy.md) — tests run in a single gate
- [0110-security-operations.md](0110-security-operations.md) — cooldown and pinning of transitive dependencies
- [0140-documentation-operations.md](0140-documentation-operations.md) — documentation operations (the canonical documents the viewer renders)
- [0141-portal-operations.md](0141-portal-operations.md) — portal operations (the parent decision of this ADR)
- [0153-ci-configuration.md](0153-ci-configuration.md) — the delivery workflow to GitHub Pages

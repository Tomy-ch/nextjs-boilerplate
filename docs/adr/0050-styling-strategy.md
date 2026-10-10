# Styling Strategy

With Tailwind CSS as the main axis, this ADR defines **a limited allowance for CSS Modules as an escape hatch (styled-components / emotion not adopted) / where the `cn()` helper lives / design token management / the boundary between global and local**.

## Status

Accepted

## Context

`package.json` has `tailwindcss` / `@tailwindcss/postcss`, and `postcss.config.mjs` and `src/app/globals.css` exist, so **Tailwind v4 is effectively already adopted**. This ADR settles design token management, the `cn()` helper, the global vs local boundary, and the policy of not adopting alternatives.

## Decision

### Tailwind CSS as the main axis, CSS Modules allowed in a limited way as an escape hatch

- Styling uses **Tailwind CSS (v4) utility classes by default (as the main axis)**
- **CSS Modules are allowed in a limited way, as an escape hatch, only for complex styles that are hard to express with Tailwind utilities (advanced `:has()` / complex pseudo-element chains / keyframes, etc.)**. First check whether Tailwind can cover it, and use CSS Modules only when it cannot
  - Rationale (vendor-independent / [0010](0010-standards-and-non-lockin.md)): CSS Modules are **plain CSS scoped at build time, with no runtime CSS-in-JS**. They therefore do not conflict with the RSC default ([0040](0040-routing-rendering-strategy.md)) and work as-is in Server Components. In addition, **Next.js / the bundler ship them as a standard feature** (no dependency on a particular library arises), so they pass the non-lock-in operational test "the pattern holds even with the vendor taken out of the justification". It is a choice that rides on the platform standard ([0010](0010-standards-and-non-lockin.md)) and brings no additional library or runtime
  - CSS Modules are a standard platform feature and **introduce no additional dependency**, so nothing becomes subject to exact pinning. Only if a library is added in the future, for the `cn()` implementation or the like, is [0004](0004-library-management.md) (exact pin + `pnpm audit`) followed
- **Runtime CSS-in-JS such as styled-components / emotion is not adopted**
  - Why not: these are **CSS-in-JS that generates styles at runtime** and conflict with the Server Component default ([0040](0040-routing-rendering-strategy.md)) (forced `"use client"`, runtime cost, more complex SSR hydration). They lack the CSS Modules advantage of "scoped at build time, no runtime", so they are not adopted even as an escape hatch

### The `cn()` helper

- The class-joining helper **`cn()` is adopted**. Its home is **inside the `components` kernel** (per the naming discipline of [0021](0021-frontend-responsibility.md), no general-purpose home such as `utils/` is created)
- The implementation libraries are **`clsx` + `tailwind-merge`** (the same ones [0052](0052-ui-component-policy.md) already names as shadcn's real npm dependencies). Their responsibilities map 1:1 to joining and conflict resolution, and each passes [0004](0004-library-management.md)'s primary check (single responsibility × single upstream) on its own. Exact pin + `pnpm audit` follow [0004](0004-library-management.md)
- `tailwind-variants` is **not adopted**. It is a bundle of variants + slots + responsive + merge whose responsibility cannot be named in one word, and its responsibility also conflicts with `cva` below

### Variant definitions = `class-variance-authority` (cva)

- **`cva` is adopted** for component variant definitions. The official shadcn/ui components that [0052](0052-ui-component-policy.md) adopts are distributed already using cva, so not adopting it would mean rewriting the distributed code every time (per [0010](0010-standards-and-non-lockin.md), do not invent mechanisms of our own)
- Like `cn()`, its home is **inside the `components` kernel**. Variant definitions are not scattered into features

### Design tokens = CSS variables

- Design tokens are managed as **CSS variables** (consistent with Tailwind v4's CSS-first configuration). Token definitions are gathered in `globals.css` (or the CSS it imports)

### Boundary between global and local

- **Global CSS is gathered in `src/app/globals.css`**. First check whether utilities can cover it, and do not pile individual rules onto `globals.css` (the co-location policy of [0027](0027-directory-structure.md))
- Component-specific styles are co-located in each component as utility classes. CSS in separate files is minimized
- When CSS Modules are used, they too are **co-located with the target component** ([0027](0027-directory-structure.md)) and localized as `*.module.css`. They do not leak into the global scope, keeping the escape hatch's range of application minimal

### Theme / dark mode

- The default approach for themes (light / dark, etc.) is **switching the CSS-variable design tokens (above)**. By referencing colors through tokens rather than hard-coding them everywhere, switching themes stays closed within swapping tokens
- Dark mode has **`prefers-color-scheme` (following the OS setting) as its default base**, expressed with Tailwind v4's `dark` variant. If an explicit user switch (toggle) is added, the switch state is kept to minimal state management (local state for local use; when shared across, in `stores` adopted by [0060](0060-state-management.md) (Zustand; its home is [0023](0023-stores-kernel.md)). Avoid overusing Context)
- **The family (`data-surface`) attribute is placed at a position that includes the Portal's exit.** Overlay components (Dialog / Popover / DropdownMenu / Sheet / Tooltip / ContextMenu) are emitted directly under `document.body`, so an attribute placed on the layout shell's outer frame does not reach the overlay contents. The body text takes effect from server rendering via the attribute the layout shell puts on the outer frame, and overlay contents take effect after hydration via the attribute bridged to `body` — an overlay is opened by interaction, so the moment it opens is always after hydration, and there is no instant when it is rendered in the default family. Pointing the Portal's `container` inside the family is not adopted (it would mean adding an endpoint to every overlay component and having the caller specify it every time). The family axis itself is [0051](0051-styling-system.md)
- **The concrete color palette, the kinds of themes provided and whether there is a toggle UI are use-case dependent**, so they are not decided here. This repository defines the frame of the mechanism: "token switching + following `prefers-color-scheme`"

## Prohibitions

- ❌ Introducing **runtime CSS-in-JS** such as styled-components / emotion (conflicts with the RSC default of [0040](0040-routing-rendering-strategy.md)) (Enforcement: none — a decision not to adopt. Not having a runtime CSS-in-JS dependency is itself the state; bringing one in shows up in the diff as a dependency added to `package.json`)
- ❌ Escaping rules that Tailwind utilities can cover into CSS Modules or `globals.css` (CSS Modules are strictly an escape hatch for complex styles that cannot be covered; the default is Tailwind) (Enforcement: Prose — **not mechanizable**. Whether utilities can cover it is a judgment about the style to express, not decided by the shape of the CSS)
- ❌ Using CSS Modules in global scope (overusing `:global`), breaking the locality of co-location (Enforcement: Prose — **partly mechanizable**. Occurrences of `:global` in `*.module.css` can be detected statically, but no rule exists. Whether it is overuse is decided by the judgment of localization)
- ❌ Placing `cn()` in a general-purpose home other than `components` (`utils/` / `lib/`, etc.) (the naming discipline of [0021](0021-frontend-responsibility.md)) (Enforcement: ESLint `boundaries/no-unknown-files` rejects homes outside the layers, such as `src/utils` / `src/lib`. Placing `cn()` inside a layer (such as a `lib/` under a feature) is Prose — **mechanizable** (the form that rejects imports of `clsx` / `tailwind-merge` outside `components` with `no-restricted-imports`; no rule exists))
- ❌ Piling rules that utilities can cover onto `globals.css` (Enforcement: Prose — **not mechanizable**. Whether utilities can cover it is a judgment about the style to express, not decided by the shape of the CSS)
- ❌ Placing the family attribute only inside the Portal's exit (overlays get rendered in the default family) (Enforcement: `surface-portal-bridge.test.tsx` pins that the bridge puts the family on the Portal's exit. Whether the layout shell that sets the family mounts the bridge is Prose — **mechanizable** (the form where a gate checks that a file setting `data-surface` renders `SurfacePortalBridge`; no rule exists))

## Related ADRs

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the justification axis for adopting CSS Modules (§1 ride on the platform standard / §2 vendor-independent = no additional dependency and no runtime)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the RSC default. The basis for allowing CSS Modules (build time, no runtime) and not adopting runtime CSS-in-JS (styled-components / emotion)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — where `cn()` lives (the `components` kernel / the naming discipline that forbids general-purpose homes)
- [0027-directory-structure.md](0027-directory-structure.md) — the co-location policy for styles (gathering in `globals.css` / utilities by default / localizing `*.module.css`)
- [0004-library-management.md](0004-library-management.md) — the adoption flow for the `cn()` implementation libraries and the like (exact pin / audit). CSS Modules themselves are a standard feature, so no additional pin arises
- [0051-styling-system.md](0051-styling-system.md) — the contents of the frame this ADR defined (design token system / responsive / motion / print). The SSOT of tokens, the discipline of the semantic layer, and the two axes of family and color scheme are held on 0051's side
- [0052-ui-component-policy.md](0052-ui-component-policy.md) — adopting the UI library (shadcn/ui + Tabler icons) (connects to this ADR's Tailwind main axis)
- [0060-state-management.md](0060-state-management.md) — where the theme-switch state lives (local state by default / cross-cutting state in `stores`)

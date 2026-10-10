# Project Scope

States **what kind of team and system this repository is designed for**, and **the uses it does not anticipate**.
The ADRs hold the basis; this page only draws the lines.

## Intended Team

It assumes a team that understands the following.

- Next.js 16's App Router and React 19 — the rendering model that makes Server Components the default and treats `"use client"` as a bundle
  boundary ([0040](../adr/0040-routing-rendering-strategy.md) / [rendering.md](../design/rendering.md))
- Development on the **consuming side** of an API whose contract is OpenAPI — generating types and validation from the contract, not copying them by hand
  ([0070](../adr/0070-backend-role-separation.md) / [0072](../adr/0072-api-type-generation.md))
- Separation of responsibilities by feature slices and kernels, and the boundary checks that guard it by machine
  ([0020](../adr/0020-adopted-architecture.md) / [0021](../adr/0021-frontend-responsibility.md))
- A toolchain centered on pnpm / mise / biome
  ([0001](../adr/0001-package-manager.md) / [0003](../adr/0003-version-manager.md) / [0002](../adr/0002-formatter-linter.md))
- Tailwind and design tokens, and shadcn/ui's copy-in form
  ([0050](../adr/0050-styling-strategy.md) / [0052](../adr/0052-ui-component-policy.md))
- Basic security boundaries — understanding CSP, where secrets live, and what goes out through `NEXT_PUBLIC_`
  ([0111](../adr/0111-csp-security-headers.md) / [0030](../adr/0030-environment-variable-management.md))

It presumes there are members who can read the ADRs and rewrite them as their own project's decisions. Every bundled
decision is recorded in an overturnable form, and to overturn one, overwrite or supersede the ADR
(e.g. self-hosting in [0011](../adr/0011-no-docker.md)).

## Intended Development Style

It presumes working together with AI coding agents, and bundles the agent contract (`AGENTS.md`) and skills for working procedures
([0152](../adr/0152-agents-md-policy.md) / [0154](../adr/0154-claude-skills-operations.md) /
[0155](../adr/0155-claude-skills-development.md)). It does not get in the way of manual development. Procedures for agents are held by
the skills, and procedures for people by the READMEs and [playbook.md](../playbook.md).

This says nothing about the application. Runtime, build, tests, contracts and CI all
work without AI.

## Intended System

- **Next.js as the presentation layer.** Its responsibilities are UI rendering and a thin BFF; business logic, the domain model and persistence are
  held by a backend in a separate repository ([0011](../adr/0011-no-docker.md) / [0070](../adr/0070-backend-role-separation.md))
- **A system whose contract has a separate owner.** The contract is OpenAPI, owned by the backend, and this side is purely its consumer
- **A system delivered to a PaaS or a static CDN.** SSR / SSG / ISR are all available, but self-hosted container delivery is
  not a first-class deployment target ([0011](../adr/0011-no-docker.md))
- **A system that delegates authentication to an external IdP.** Credentials are relayed without validation, and only the design of the authentication screens is owned
  ([0079](../adr/0079-auth-frontend-seam.md))
- **A long-maintained application with many screens.** Per-layer READMEs, screen specifications, boundary checks and the 100%
  test gate exist so that placement decisions do not waver as screens increase
  ([0143](../adr/0143-spec-driven-development.md) / [0090](../adr/0090-testing-strategy.md))

The bundled libraries go only as far as "general-purpose and everyday for the presentation layer"; what depends on the use case (i18n / PWA / payments / analytics,
etc.) holds only the coordinates of an extension point ([0011](../adr/0011-no-docker.md)). The breakdown is in [out-of-scope.md](out-of-scope.md).

## Uses Not Anticipated

- **Full-stack Next.js.** A system that wants DB connections, an ORM and business rules in `src/`. That is outside the role boundary,
  and would be a re-evaluation, not an extension ([0011](../adr/0011-no-docker.md))
- **A project that wants to start minimal.** At a scale that wants to get by with `{app, components, hooks, lib}`, the per-layer
  READMEs, boundary checks and skills look like excessive groundwork (the patterns [0020](../adr/0020-adopted-architecture.md) does not adopt)
- **A team that wants to classify UI by granularity or another vocabulary.** Atomic Design / Feature-Sliced Design would duplicate the names of responsibilities,
  so they are not adopted (same as above)
- **A system that wants business judgments in the front end.** A design that derives values the contract does not return, or distinguishes on screen failures the server
  does not distinguish, becomes a copy of the rules on top of this structure ([0070](../adr/0070-backend-role-separation.md))

## Architectural Premises

- **Feature slices × presentation-layer kernels.** With `features` as the primary axis, it has the cross-cutting kernels `app` / `components` / `model` /
  `adapters` / `capabilities` / `stores` / `config` / `errors` / `logging` / `observability`
  ([0020](../adr/0020-adopted-architecture.md) / [0027](../adr/0027-directory-structure.md))
- **Dependencies point inward only**, enforced in CI by ESLint's boundary checks ([0021](../adr/0021-frontend-responsibility.md))
- **App Router only, Server Components by default.** Server Actions live in the feature's `actions.ts`; a page is a thin
  driving adapter ([0040](../adr/0040-routing-rendering-strategy.md))
- **Do not pre-emptively handle a problem another layer owns.** Re-sanitizing upstream-originated values exhaustively is
  not made a design goal. Security concerns, however, lie outside this principle
  ([0020](../adr/0020-adopted-architecture.md), on not pre-emptively handling problems another layer owns)
- **Environments come in two groups, stand-alone and cloud.** `local` / `ci` run every screen without contracting anything, and `dev` /
  `stg` / `prd` point at your own IdP / API ([0011](../adr/0011-no-docker.md), which defines the environments)

# Architecture Decision Records (ADR)

This directory records the important technical decisions of this project.

## Rules

- 1 file = 1 decision
- Numbers are assigned in topic-ordered blocks (each block of ten = a subject block. e.g. `002x` architecture / `004x` routing / `007x` data and BFF / `015x` process)
- Status is always stated. Its spelling is one of `Accepted` / `Accepted (exclusion)` / `Accepted (partial exclusion)` / `Superseded by NNNN` (the exclusion distinction and how a decision moves to Superseded are in [0140](0140-documentation-operations.md))
- The body is written in the following skeleton. Sections may be added according to the content of the decision, but the order is not broken
  1. A preamble directly under the heading — what the ADR decides, and where it draws the line with neighboring ADRs
  2. `## Status`
  3. `## Context` or `## Rationale / Purpose`
  4. Decisions — either numbered from `### 1.` under `## Decision`, or one `##` per decision
  5. Only when needed, `## Rejected Alternatives` (what was compared and not adopted, with reasons) and `## Notes`
  6. `## Prohibitions` — one item per line starting with `❌`, with `(Enforcement: …)` at the end of the line saying what rejects it. For what a machine does not reject, write `Prose —` followed by one of the three verdicts (**not mechanizable** / **partly mechanizable** / **mechanizable**) and the reason; for a decision not to adopt, write `none —` ([0144](0144-decision-enforcement-pairing.md)). An exclusion that forbids nothing has no such section at all
  7. `## Related ADRs` — one per line, stating what is taken from that ADR
- Other ADRs are pointed at only by number, `[NNNN](path)`, without adding a section number (`§2` / `Decision 4`). Which section is meant is conveyed by writing, as a summary, the content you are using ([0146](0146-rule-reference-stability.md))

## ADRs to Be Defined

Decision areas not yet started are tracked by the issue tracker. The list is not copied into this directory because it would be double bookkeeping that goes stale the moment one lands ([0152](0152-agents-md-policy.md) on how areas not yet decided are handled). A new ADR is filed once its content is agreed in an issue, numbered by the numbering rule above.

## Index

- [0001-package-manager.md](0001-package-manager.md) - Choice of package manager (pnpm adopted / lockfile committed / npm and yarn forbidden)
- [0002-formatter-linter.md](0002-formatter-linter.md) - Choice of formatter and linter (Biome first + ESLint filling the gaps)
- [0003-version-manager.md](0003-version-manager.md) - Choice of version manager for Node.js / pnpm (mise adopted)
- [0004-library-management.md](0004-library-management.md) - Library selection and operating policy (meta-policy for npm dependencies / exact pin / audit)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) - Standards compliance and no lock-in (the permanent meta-axis of design judgments = ride on de-facto seams / the no-lock-in test)
- [0011-no-docker.md](0011-no-docker.md) - Policy of not adopting Docker (defining the presentation layer → application foundation role)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) - Adopted architecture (feature slices × presentation-layer kernels / design principles / rejected patterns)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) - Separation of responsibilities within the frontend (kernel responsibilities / dependency matrix / naming discipline / Enforcement)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) - The `capabilities` kernel (home of cross-cutting client hooks / supplying runtime capabilities / fixed use client)
- [0023-stores-kernel.md](0023-stores-kernel.md) - The `stores` kernel (cross-cutting client state = home of Zustand / promotion criteria)
- [0024-adapters-server-client-split.md](0024-adapters-server-client-split.md) - The server/client split of adapters (two-axis model / client-side external connection boundary = structural blocker S1)
- [0025-app-layer-elements.md](0025-app-layer-elements.md) - Element composition of the app layer (Route Handler / metadata / 3 elements = S2)
- [0026-layout-shell-mount.md](0026-layout-shell-mount.md) - Mounting cross-cutting UI / Providers in layouts (app shell composition = S4)
- [0027-directory-structure.md](0027-directory-structure.md) - Directory structure (physical placement / `@/*` alias / co-location / sharing granularity)
- [0028-naming-convention.md](0028-naming-convention.md) - Naming conventions (file names / identifiers / route segments / environment variables / ADR files)
- [0029-type-design-discipline.md](0029-type-design-discipline.md) - Type design discipline (discriminated unions / settling at the boundary / branded types / `satisfies`)
- [0030-environment-variable-management.md](0030-environment-variable-management.md) - Environment variable management (config per purpose / server and client split / the `NEXT_PUBLIC_` boundary / secrets)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) - Policy for supplying policy state (consent / feature-flag) (source adapter + no-op by default + stateless props = S3)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) - Routing and rendering strategy (App Router / Server Components by default / Server Actions / route-as-modal / granularity of Suspense boundaries)
- [0041-cache-components-decision.md](0041-cache-components-decision.md) - The judgment to enable Cache Components (PPR)
- [0042-react19-rendering-api.md](0042-react19-rendering-api.md) - Conventions for React 19 rendering APIs (how to write `use()`, etc.)
- [0043-middleware-policy.md](0043-middleware-policy.md) - Middleware (Proxy) policy (Next.js 16 proxy.ts / thin, last resort / authentication out of scope)
- [0044-seo-metadata-strategy.md](0044-seo-metadata-strategy.md) - SEO / metadata strategy (Metadata API / sitemap and robots / canonical / JSON-LD / icon scheme)
- [0045-fonts-and-images.md](0045-fonts-and-images.md) - Fonts and images (next/font / next/image / public/ / dynamic OG)
- [0050-styling-strategy.md](0050-styling-strategy.md) - Styling strategy (Tailwind as the main axis + CSS Modules allowed in limited cases / `cn()` / design tokens = CSS variables)
- [0051-styling-system.md](0051-styling-system.md) - Styling system (design tokens / responsive / motion = Framer Motion / print / stacking-order bands)
- [0052-ui-component-policy.md](0052-ui-component-policy.md) - UI component policy (shadcn/ui + Tabler icons adopted)
- [0053-ui-component-interaction-seam.md](0053-ui-component-interaction-seam.md) - UI component policy and the interaction a11y seam
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) - UI catalog (Storybook) policy
- [0055-design-system-export.md](0055-design-system-export.md) - Exporting the design system externally (the artifact is tool-independent / only delivery knows the vendor / import is one way)
- [0056-mock-app-exclusion.md](0056-mock-app-exclusion.md) - Not publishing the mock app (exclusion)
- [0060-state-management.md](0060-state-management.md) - State management policy (server state = fetch by default / client = local by default / react-hook-form and Zustand adopted)
- [0061-form-mutation-ux.md](0061-form-mutation-ux.md) - The canonical mechanism for the form submission flow (`<form action>` + `useActionState` + `useFormStatus`)
- [0062-form-input-validation.md](0062-form-input-validation.md) - Form input validation UX (client validation / the reuse boundary of generated zod)
- [0063-mutation-result-notification.md](0063-mutation-result-notification.md) - UX for notifying mutation results (inline / toast / redirect + live region)
- [0070-backend-role-separation.md](0070-backend-role-separation.md) - Role separation from the backend (BFF = thin proxy / contract SSOT / ownership of boundary values)
- [0071-bff-api-integration.md](0071-bff-api-integration.md) - BFF / API integration (the fetch wrapper in adapters / resilience adaptation / error normalization / caching)
- [0072-api-type-generation.md](0072-api-type-generation.md) - Type generation (orval + zod generation / gh import + short SHA / do-not-edit / drift gate)
- [0073-pagination-fetch-boundary.md](0073-pagination-fetch-boundary.md) - The data-fetching boundary for pagination and infinite scroll
- [0074-runtime-communication-seam.md](0074-runtime-communication-seam.md) - Bidirectional / streaming communication seam (WebSocket / SSE)
- [0075-file-upload-seam.md](0075-file-upload-seam.md) - Receiving and delivering files (the receiving endpoint is a Server Action / delivery from a public origin / direct upload to a signed URL not adopted)
- [0076-payment-ui-seam.md](0076-payment-ui-seam.md) - Payment UI seam (mount seam and the PCI boundary)
- [0077-bff-abuse-protection-boundary.md](0077-bff-abuse-protection-boundary.md) - BFF abuse protection boundary (infra / edge seam)
- [0078-dynamic-feature-flag-seam.md](0078-dynamic-feature-flag-seam.md) - Dynamic feature flag and progressive delivery seam (A-B / gradual rollout)
- [0079-auth-frontend-seam.md](0079-auth-frontend-seam.md) - The frontend-side seam for authentication
- [0080-error-handling.md](0080-error-handling.md) - Error handling (errors kernel / sentinel classification / boundary normalization / error.tsx hierarchy / loading and loading UI)
- [0081-observability-logging.md](0081-observability-logging.md) - Observability and logging (logging/observability kernels / OTLP-only / signal gating / RUM not bundled)
- [0082-client-observability.md](0082-client-observability.md) - Client observability (Web Vitals RUM / client error collection / product analytics seam)
- [0090-testing-strategy.md](0090-testing-strategy.md) - Testing strategy (Vitest + RTL + MSW + Playwright / strategy aligned with go / 90% gate)
- [0091-test-verification-methods.md](0091-test-verification-methods.md) - Policy on test verification methods (where async RSC tests go / automated a11y tests = axe built in)
- [0100-accessibility-target.md](0100-accessibility-target.md) - Accessibility target (WCAG AA / biome a11y / manual checks)
- [0101-performance-budget.md](0101-performance-budget.md) - Performance budget (Core Web Vitals / the mechanism is defined, thresholds are use-case dependent)
- [0102-browser-support.md](0102-browser-support.md) - Browser support matrix (endorsing the Next.js default browserslist / dropping support is use-case dependent)
- [0110-security-operations.md](0110-security-operations.md) - Security operations (Dependabot cooldown / gitleaks / two-stage Trivy / CodeQL / image-scan is an exclusion)
- [0111-csp-security-headers.md](0111-csp-security-headers.md) - CSP and security headers (runtime)
- [0112-data-classification-cache-boundary.md](0112-data-classification-cache-boundary.md) - Data classification and the cache boundary (where PII / user-scoped / secrets live, and the checkpoints at each stage)
- [0113-development-access-surface.md](0113-development-access-surface.md) - The control surface for development endpoints (decided by the state you want to reach / build exclusion and run-time judgment are separate guarantees)
- [0120-locale-aware-formatting.md](0120-locale-aware-formatting.md) - Locale-aware formatting (dates and numbers + Intl / date-fns date arithmetic)
- [0121-i18n-strategy.md](0121-i18n-strategy.md) - i18n strategy (not bundled in the core = exclusion / seams when adopted)
- [0130-pwa-strategy.md](0130-pwa-strategy.md) - PWA strategy (Manifest / SW / offline not bundled in the core = exclusion)
- [0131-cookie-consent.md](0131-cookie-consent.md) - Cookie consent (lightweight consent mechanism + script gate + a tag manager behind the gate are bundled / CMP and IAB TCF are not. The measurement products themselves are chosen as the contents of the container)
- [0140-documentation-operations.md](0140-documentation-operations.md) - Documentation operations policy (EN canonical direction / taxonomy / creating rules.md / ADR immutability)
- [0141-portal-operations.md](0141-portal-operations.md) - Portal operations (manifest = structural control / registration criteria / GitHub Pages)
- [0142-license.md](0142-license.md) - License choice (basis for adopting MIT / OSS contributions = inbound=outbound / relation to private:true)
- [0143-spec-driven-development.md](0143-spec-driven-development.md) - Spec-driven development (screen requirements held as specifications / no generating scaffold / reconciliation with the implementation in two forms: existence (machine) and content (reading side by side))
- [0144-decision-enforcement-pairing.md](0144-decision-enforcement-pairing.md) - Stating decisions together with enforcement (consider machine enforcement before escaping to prose / write why it is not mechanizable)
- [0145-docs-viewer-package-boundary.md](0145-docs-viewer-package-boundary.md) - The docs-viewer package boundary (guaranteeing dependency separation with a package boundary)
- [0146-rule-reference-stability.md](0146-rule-reference-stability.md) - Referencing rules and generating the tally (point with section anchors / do not count by hand / three verdicts)
- [0150-git-workflow.md](0150-git-workflow.md) - Git branch and commit policy
- [0151-git-hooks.md](0151-git-hooks.md) - Pre-commit / pre-push hook policy (lefthook adopted)
- [0152-agents-md-policy.md](0152-agents-md-policy.md) - AGENTS.md policy
- [0153-ci-configuration.md](0153-ci-configuration.md) - CI configuration (job split / SHA pins / minimal permissions / hooks mirror / matrix not adopted)
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) - Claude skills policy (operations)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) - Claude skills policy (development)
- [0156-browser-observation-tooling.md](0156-browser-observation-tooling.md) - Browser observation tooling (division of labor across 3 lanes / CLI-based, no MCP registration / no connection to real profiles / how tools are obtained split between pnpm and mise)
- [0157-inspection-declaration-discipline.md](0157-inspection-declaration-discipline.md) - Inspection declaration discipline (do not fall to "no violations" when an inspection does not hold / suppressions carry a reason and a removal condition)
- [0158-code-search-tooling.md](0158-code-search-tooling.md) - Code search and impact analysis tooling (scope of adoption / installation path / allow and deny boundary)
- [0159-script-structure.md](0159-script-structure.md) - Language and structure of helper scripts (TypeScript / 1 tool 1 directory / separating entry points from judgments)
- [0159-1-cross-repository-references.md](0159-1-cross-repository-references.md) - References to other repositories (the default is `redirect.github.com` / plain links are reserved / the judgment to use one belongs to a person)
- [0160-agent-environment-loop.md](0160-agent-environment-loop.md) - Improving the agent environment as a loop (observe → improve → re-measure / judge by usage type / three places for state)
- [0161-development-window-as-feedback-unit.md](0161-development-window-as-feedback-unit.md) - The development window as the unit of feedback (why sessions, commits and PRs are not the denominator / timestamps first, records as a complement)
- [0162-application-independence-from-ai.md](0162-application-independence-from-ai.md) - The application does not depend on AI (no agent among the conditions for holding / dependence confined to the development flow / no tools that put themselves on the path)

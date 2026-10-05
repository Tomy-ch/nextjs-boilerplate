# Portal Operations

Defines the documentation portal's (`docs/portal/`) **manifest structure / registration criteria / division of responsibility between portal and docs / generation and delivery mechanism / operational skills / implementation status**. It makes concrete the third tier (the generated portal) of [0140](0140-documentation-operations.md)'s three-tier strategy.

## Status

Accepted

## Context

The portal is a generated view of the canonical documents. Without registration criteria for what goes on it and a division of responsibility between portal and docs, the portal drifts into an exhaustive dictionary of every README, and the content gets two SSOTs. This ADR defines the registration criteria and the division of responsibility.

## Decision

### 1. manifest = Single Source of Structure (Curated Manual)

- **`docs/portal/manifest.yaml`** is the single source of the portal's structure. It has two parts:
  - **The `meta:` block (visible structure)**: `groups` (sidebar top-level page order, each with `sections`) / `subgroups` (subdivides a section by role) / `section_titles` (display-name overrides) / `reference_links` (permanent quick links to generated HTML; e.g. openapi / coverage)
  - **Section entries (everything except `meta`)**: `{src, dst}` copy pairs. `src` = a canonical README in the repository, `dst` = `docs/portal/guides/<flat-name>.md`
- **Principle: "the manifest is a curated guide, not a dictionary"**. The portal is a curated narrative manual read by humans, not an exhaustive dictionary of every README. Bulk additions break the curation and bury the conceptual flow under component-level noise

### 2. Registration Criteria (Manual Registration vs Auto-Discovery)

- **READMEs of code packages / layers (`src/**/README.md` etc.) are registered in the manifest by hand** and copied to `guides/` (curation is a human judgment)
- **Documents directly under `docs/<dir>/*.md` are discovered automatically by an FS scan** (placement and titles come from `meta:`; only the file enumeration is on the generation script's side). The scan splits each directory by suffix: a sibling `*.ja.md` is the Japanese mirror of its canonical ([0140](0140-documentation-operations.md)), listed with the language `ja` under the same identifier as the canonical. A manifest entry whose `dst` is a `*.ja.md` is treated the same way
- **An unregistered on-disk README is treated not as drift but as "a candidate awaiting a curation judgment"** (it is not added automatically)

### 3. Division of Responsibility: portal and docs

- **The manifest = structure control only** (what is placed in which group / section, and in what order). **The README is the source of truth for a card's content** ([0140](0140-documentation-operations.md) canonical / [0021](0021-frontend-responsibility.md) per-package README)
- The portal is **a generated view of the canonical documents** and holds no SSOT of content (content lives in the canonical READMEs / `docs/**`)

### 4. Generation and Delivery

- **Generation scripts (`scripts/portal/`)**: the manifest's `src`→`dst` copy (`gen-portal-docs`) / `docs.json` output from the manifest + FS scan (`gen-docs-json`). In both, judgments are moved into pure functions and FS I/O is confined to the CLI side (testability)
- **The viewer is an independent workspace package (`docs-viewer/`)**, built with **Vite**. The package is separate because **its sanitization tolerance differs from the application's**: the broad allowlist documents need (`table` / `pre` / `img` / `language-*` class) is placed **where the application cannot import it**. The separation is secured by a package boundary rather than a convention. It is Vite rather than esbuild because passing the design tokens through needs a Tailwind build
- **Delivery = GitHub Pages**. It fires on a push to `production`. **Pages allows only one site per repository**, so `docs/` is copied to the site root, with the portal at `/portal/` and Storybook at `/storybook/` side by side as siblings. The root holds only a redirect to the entry point
- **Deep links are expressed as a location hash (`#/<group>/<section>`), so no 404 fallback is needed**. The path never reaches the server
- **Links pointing to the portal are replaced by `make setup-replace-repository-reference`**. The default is the site root assembled from `<owner>/<repo>`, and a custom domain overrides it via `PORTAL_URL`. Before replacement, the `portal` marker (`portal:replace-*`) switches between two links so that the generic link stays live
- **Generated artifacts (`guides/` / `docs.json`) are not tracked**. They are assembled at delivery, so drift cannot occur, and there is no drift-detection mechanism

### 5. Operational Skill Loop

- **readme-review** (manual-worthiness judgment of content = the single source of the criteria) → **portal-manifest-sync** (registration curation into the manifest; edits only `manifest.yaml`, adds nothing automatically) / **sync-readme** (structural drift alignment). The skill system is [0155](0155-claude-skills-development.md) (development skills; placement, naming, and frontmatter are shared with [0154](0154-claude-skills-operations.md))
- The judgment criteria are referenced at run time from the current manifest (the criteria are not duplicated). The criteria vocabulary is re-derived from the registered entries, and **component reference READMEs (the fixed form under `src/components/**`) and feature slices are outside the judgment** — the former are owned by Storybook and TSDoc, the latter by the required-section check of `docs/templates/feature-readme.md`

### 6. Implementation Status

- **Enabling Pages, and allowing the delivery source branch in the deployment branch policy of the `github-pages` environment, are owned by `make pages-delivery-apply`, which `make setup-repo` calls**. Without the allowance, `docs-deploy` starts as a job but fails without running a single step, and the log shows no reason — the delivery source must be kept aligned in one place with the workflow's push trigger, and as a manual step a failure would go unnoticed
- Mechanical drift detection is owned by the generation scripts (`portal:guides` exits non-zero when stale, `portal:docs` emits structural warnings), and `portal-manifest-sync` reads that and handles classifying the placements the generation side silently swallows (registrations that fall into `Other`) and the curation candidates

## Prohibitions

- ❌ Giving the manifest content (a card's body) (the canonical README is the source of truth for content; the manifest is structure control only) (Enforcement: Prose — **partly mechanizable**. Extra keys in a section entry could be blocked by making `copyEntrySchema` in `scripts/portal/portal-manifest.ts` strict, but there is no rule. Whether a `meta` display name is swelling into body text is decided by a judgment of meaning)
- ❌ Treating an unregistered README as drift and registering it automatically (curation is a human judgment) (Enforcement: none — a decision not to adopt. No mechanism that registers unregistered READMEs automatically is in place, and a change adding one would show in the diff as a new script)
- ❌ Hand-editing generated artifacts (`docs.json` / `dist/**`)
- ❌ Making the portal an exhaustive dictionary of every README (it is a curated guide) (Enforcement: Prose — **not mechanizable**. What goes on it is a curation judgment and is not decided by the shape of the manifest)

## Related ADRs

- [0140-documentation-operations.md](0140-documentation-operations.md) — canonical / three-tier strategy, per-package README (the parent decision of this ADR; the portal is the third tier)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — per-layer READMEs (the source of portal cards)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — sanctions readme-review / sync-readme / portal-manifest-sync (development skills; placement, naming, and frontmatter shared with [0154-claude-skills-operations.md](0154-claude-skills-operations.md))
- [0153-ci-configuration.md](0153-ci-configuration.md) — the GitHub Pages delivery workflow (Documentation group)

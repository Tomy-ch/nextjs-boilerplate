# UI Component Policy (Adopted)

As the UI component foundation, this repository **adopts** **shadcn/ui** (the copy-in approach of Radix primitives + Tailwind) + **@tabler/icons-react** (icons) + shadcn-family complex input components (date pickers, etc.). Their home is the `components` kernel ([0021](0021-frontend-responsibility.md)).

## Status

Accepted

## Context

This repository is "a general Next.js application foundation". UI components, icons and complex input components are elements that a general application foundation needs for **general, everyday** use, not things to leave as use-case dependent. They are therefore adopted in the core, and the adoption of shadcn/ui, the icon library, form components and the handling of Headless UI-family libraries are settled here.

## Decision: Adopt shadcn/ui + @tabler/icons-react + Complex Inputs

- **UI components = shadcn/ui** (Radix UI primitives + Tailwind, the **copy-in** approach). Generated components are placed in the `components` kernel ([0021](0021-frontend-responsibility.md): cross-cutting UI = design-system-like pure UI)
- **Icons = @tabler/icons-react**. Only one file, [`src/components/icon.ts`](../../src/components/icon.ts), may name the supplier, and both features and each component in `components` reference it. The lockout is held by `no-restricted-imports` in `eslint.config.ts`. The reason for adopting it is the breadth of its vocabulary: outline alone exceeds 5,000 icons. **Not letting "an icon is missing" be a reason to adopt a second set** is the purpose of this choice
- **The public surface of icons is limited to named re-exports**. A table that looks up a component by name becomes a static reference to the whole set, putting even unused icons into the bundle. With re-exports, only what callers import remains, and the volume is absorbed by the `pnpm bundle-budget` budget ([0101](0101-performance-budget.md))
- **Public names are this surface's vocabulary, not the supplier's spelling**. Even if the supplier ships the same glyph under a different name, the public name does not change. That callers do not move when it is swapped is the very purpose of the confinement
- **Complex inputs (date pickers, etc.) = shadcn-family components** (shadcn recipes that wrap `react-day-picker` and the like with Radix/Tailwind). Placed in `components`. The default is restrained (Medium) = used when needed
- This repository's UI consists of these adopted components plus **Tailwind utilities** ([0050](0050-styling-strategy.md)) and in-feature UI ([0021](0021-frontend-responsibility.md)). **Layout that utilities cover (stack / inline / grid) is not wrapped in a component.** There is no abstraction gain between `<Stack gap={4}>` and `<div className="flex flex-col gap-4">`, and wrapping does not add to Tailwind's expressiveness. What it adds is only a surface where users hesitate every time over "write it with a utility or a component". The catalog ([0054](0054-ui-catalog-storybook.md)) shows composition examples that build the skeleton with utilities only
- **Variant definitions = `class-variance-authority` (cva)**. Adopted because the official shadcn/ui components are distributed already using cva (not adopting it would mean rewriting the distributed code every time). The conventions for where it lives and how it is used are held by [0050](0050-styling-strategy.md). **`tailwind-variants` is not adopted** — it bundles variant / slots / responsive / merge so its responsibility cannot be named in one word ([0004](0004-library-management.md)'s primary check), and its responsibility overlaps with cva
- **Rich text (TipTap) is adopted**. The a11y contract and seam of the editor itself and the display-side sanitizer are owned by [0053](0053-ui-component-interaction-seam.md); this ADR holds only the placement in the `components` kernel and the exact-pin requirement
- **Drawing the line on the core's scope**: what the core carries stops at the general UI foundation above + rich text. Local UI requirements beyond this (DnD that needs a library, such as reordering = dnd-kit, etc.) are not bundled in the core; [0053](0053-ui-component-interaction-seam.md) holds the seam and a11y contract. They are **added when needed**

### Do not add upstreams to obtain a component

The registry sometimes ships items that presuppose a headless upstream other than the one this repository adopts. **In that case the item is not copied in.** Doing so would mean carrying a second upstream for the same responsibility and taking on an entire foundation of similar size for one component ([0010](0010-standards-and-non-lockin.md) non-lock-in). Items that presuppose Base UI fall under this, and **`@base-ui/react` is not adopted**. A UI concept for which the registry has no item is treated the same way. There are two possible paths, and neither changes the public API of `components`.

- **Build it by composing components already held**
- **When composition does not reach, extract only the mechanism needed and implement it ourselves**

An alternative item the CLI suggests may overlap in responsibility with a component already held. In that case too it is not copied in; only the missing features are brought into the existing component (no vendor is added).

The decision can tip toward adding an upstream only **when several components start to require the same upstream**, or **when a requirement that our own composition cannot meet is confirmed in actual use**. These two are not processed separately but evaluated together as **one migration decision: "should the current upstream be replaced with that one?"**. **Coexistence is not chosen** — the dependency surface grows net, and components with the same responsibility split into two lines.

Weakness of the supply chain is not an argument in this decision. It is an argument for a migration decision, not for coexistence.

### Use variants only for mutually exclusive looks

What `variant` / `size` express is **looks that cannot hold at the same time**. Do not express the presence of a state, a swap of structure or a switch of behavior as a variant. When boolean props start to multiply, that is the sign to rework it into composition (the slots of [0053](0053-ui-component-interaction-seam.md)) or a component split ([0021](0021-frontend-responsibility.md)).

### The README is the authority on component layers and placement

The responsibilities of the four layers of `components` (`design-system` / `patterns` / `shell` / `app-starter`) and the division into purpose-based directories are owned by [`src/components/README.md`](../../src/components/README.md). Layers and purposes are on different axes: layers by "who rewrites it", purposes by "what the component is for".

### Upstream is a reference implementation, not something to track

Implementations taken in from shadcn/ui are held as **reference implementations**. The reason for taking them in is to start from a form that has already been optimized on Next.js and had its mechanisms generalized, not to keep tracking the upstream's versions. After intake the owner is this repository, and it may modify them.

**This is not permission to duplicate.** The discipline of consolidating a duplicate at its second occurrence ([0021](0021-frontend-responsibility.md)) applies equally inside `components`.

### Ledger and upstream tracking

**Every single component under `components` is listed by name in the ledger ([`src/components/shadcn-manifest.yaml`](../../src/components/shadcn-manifest.yaml)), which holds its relationship to upstream as `kind`.** A form that records only copied-in components is not adopted — it cannot distinguish whether "not in the ledger" means self-implemented or unrecorded, so omissions go unnoticed. Rows with an upstream hold the upstream commit at the time of intake. Since the upstream is owned as a reference implementation (previous section), a base for later reading the upstream's diff is needed on this side. **The only intake entry point is `pnpm add:ui`; the shadcn CLI is not invoked directly.** Listing in the ledger happens outside the CLI, so a component brought in by invoking the CLI directly is not listed. The meaning of the ledger's fields and the intake procedure are held by the layer README, and this ADR does not restate them. Enforcement: `pnpm check:ui` (cross-checks the ledger against the actual placement; fails on unrecorded components, rows that lost their file, and placement mismatches). Running the CLI directly is not stopped by a machine itself, but the same check rejects the result as "an unrecorded component".

**Drift checks are split into two stages, and only the first is required.** A mismatch between the ledger and the actual placement needs no network, and its cause lies in the change under review, so it is a PR gate. Upstream changes need the network, and their cause does not lie in the change under review, so they are only reported by a scheduled run and **not registered as a required check** — a PR would stop for a reason its author cannot fix, and putting a job whose reporting can be interrupted on the required list makes PRs wait forever ([0153](0153-ci-configuration.md)). What to do when the upstream moves (read the diff and take it in, or leave it) is a human judgment, and no bot rewrites it (the same shape as [0072](0072-api-type-generation.md)'s drift check). Enforcement: the job split in `.github/workflows/shadcn-drift.yaml` (`shadcn-manifest` runs on PRs and is required, `upstream` is schedule-only) / required registration in `.github/settings/branch-protection.json` / not putting jobs that do not run on PRs on the required list is `make actions-required-check-lint` ([0153](0153-ci-configuration.md)).

**Classes written under `components` are checked by building the real CSS and matching against the output.** Tailwind emits nothing for a class it does not know, and nothing fails — defects such as a transparent surface, a missing focus ring or an invisible selected state do not appear until seen in a browser. Copy-in brings in classes that presuppose tokens defined by the upstream's theme, so this is a normal condition that can arise with every intake, and an obligation of the side that modifies it as a reference implementation (previous section). **Having no output and being forbidden to write are separate** — classes that deliberately have no CSS (decorative specifications kept because no animation plugin is adopted, etc.) are excluded on the check side with a reason and not removed from the implementation. Removing them would lose information the generated code carried. The range is under `components`, where copy-in lands. Enforcement: `pnpm check:classes` (the `component-classes` job; it needs no network and is caused by changes, so it is a PR gate and required). The check looks only at classes and does not reach CSS variables without a prefix slipping in — those are looked at by a person at intake (the procedure is in the layer README).

### Separate behavior from looks only when the behavior is needed in a second place

Moving only the behavior out into a hook or a headless component is limited to **when the need to use the same behavior with a different look actually arises**. Splitting ahead of time just splits one component into two files, and readers have to follow both.

## Conformance with 0010 (Vendor-Independent Justification + Non-Lock-In)

This adoption satisfies the two principles of [0010](0010-standards-and-non-lockin.md) (ride on standards / the designer is the one who chooses).

**§1 Conformance to standards and the de facto**:

- Radix UI primitives are headless primitives that implement the **WAI-ARIA Authoring Practices** (the industry-standard accessibility patterns), riding on a standard rather than being an invention of their own
- @tabler/icons-react rides on the common composition of SVG icons — a 24px grid, `currentColor` and strokes — and has no rendering mechanism of its own. It is distributed as React components, so it is bundled the same way as other SVG icon sets

**§2 Vendor-independent justification** ("does it hold with that vendor taken out of the justification?"):

- **shadcn/ui is the copy-in approach (bringing the code into the core)**, so **version lock as an npm dependency structurally does not exist**. After intake it is our own repository's code, and it holds even if the distributor shadcn disappears, stops updating, or is modified at will (portability = sufficient). It is chosen not "because it is shadcn" but on the independent ground of "**being able to own, as our own code, the combination of Radix's WAI-ARIA-conformant primitives + Tailwind**" (justification = sufficient)
- The icon set can be swapped for other SVG icons (Heroicons / Phosphor, etc.), and references are closed in the single file `src/components/icon.ts`. A swap is completed with only the right-hand side of this file, and the callers' spelling does not move
- Operational test (the non-lock-in judgment of [0010](0010-standards-and-non-lockin.md)): "with shadcn / Tabler taken out of the justification, is the pattern of building pure UI with Radix primitives + Tailwind + SVG icons justified?" → Yes. Riding on them without being bound

**Non-lock-in boundary (adapters / kernel boundary)**:

- Dependence on UI libraries is confined to the `components` kernel. Features and screens reference the public UI of `components` and do not scatter Radix imports directly inside features (the promotion rule of [0021](0021-frontend-responsibility.md): cross-cutting UI → `components`). This makes swapping a UI library complete within `components`. The icon supplier is narrower still: even inside `components`, nothing other than `icon.ts` may name it

**exact-pin + audit** ([0004](0004-library-management.md)):

- The real npm dependencies shadcn pulls in are added **exact-pinned** (`pnpm add -E`), and `pnpm audit` is run when adding them. Major updates go in a separate PR (0004)
- The copied-in shadcn component bodies are taken into the core as source code and are not dependency packages (only the real dependencies above are pinned)
- **The real dependencies of each component are evaluated in 0004's format before copy-in.** The decision to take in a registry item is also the decision to adopt the vendors that item pulls in. The resulting list of which component pulled in which vendor is held not by this ADR but by the intake records

## Prohibitions

- ❌ Importing Radix / react-day-picker directly inside features or screens (dependence on UI libraries is confined to the `components` kernel; the promotion rule of [0021](0021-frontend-responsibility.md)) (Enforcement: Prose — **mechanizable** (could be rejected by putting imports of `radix-ui` / `react-day-picker` into `no-restricted-imports` outside `src/components`, the same way as `iconVendorImports`; no rule exists))
- ❌ Importing the icon supplier from anywhere other than `src/components/icon.ts` (including inside `components`)
- ❌ Placing a table that looks up a component by name on the public surface of icons (the whole set lands in the bundle)
- ❌ Adopting in parallel a UI component library other than shadcn/ui (MUI / Chakra / Ant Design, etc., which ship with a runtime) (conflicts with [0050](0050-styling-strategy.md)'s Tailwind main axis + limited allowance for CSS Modules (runtime CSS-in-JS = styled-components / emotion not adopted) and with the copy-in policy; revise the ADR if needed) (Enforcement: none — a decision not to adopt. UI libraries that ship with a runtime are not among the dependencies; adding one shows up as a `package.json` diff and an ADR revision)
- ❌ Bundling an additional icon library besides @tabler/icons-react (swapping is allowed, bundling in parallel is not) (Enforcement: none — a decision not to adopt. A second icon set is not among the dependencies; adding one shows up as a `package.json` diff)
- ❌ Letting another headless upstream coexist solely because a registry item requires it (build with composition or our own implementation; adding an upstream is treated only as a migration decision away from the current one) (Enforcement: none — a decision not to adopt. Other headless upstreams such as `@base-ui/react` are not among the dependencies; adding one shows up as a `package.json` diff and a migration decision)
- ❌ Adding an adopted library without exact-pin / `pnpm audit` ([0004](0004-library-management.md)) (Enforcement: the `dependency-audit` job (`make audit`) runs `pnpm audit` on PRs that reach the lockfile and rejects high / critical findings that have a fixed version. Exact-pin is Prose — **mechanizable** (could be rejected by whether a version specifier in `package.json` has a range such as `^` / `~`; no rule exists))
- ❌ Bringing local UI requirements beyond the core's scope (DnD that needs a library, etc.) into the core within this ADR's range (the seam and contract are [0053](0053-ui-component-interaction-seam.md) / libraries are use-case dependent) (Enforcement: none — a decision not to adopt. Libraries such as DnD are not among the core's dependencies; bringing one in shows up as a `package.json` diff)
- ❌ Displaying rich text without passing it through the sanitizer (raw `dangerouslySetInnerHTML` is forbidden; the sanitizer port is [0053](0053-ui-component-interaction-seam.md))
- ❌ Placing a component not in the ledger under `components` / taking one in by invoking the shadcn CLI directly (Enforcement: `pnpm check:ui`)
- ❌ Registering the upstream-tracking check as a required check (PRs would stop for reasons their authors cannot fix; [0153](0153-ci-configuration.md))

## Related ADRs

- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the decision axis of standards conformance + non-lock-in (the justification for this adoption)
- [0004-library-management.md](0004-library-management.md) — exact-pin / `pnpm audit` / major updates in a separate PR
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind main axis + limited allowance for CSS Modules (styled-components / emotion not adopted; the styling means of shadcn/ui)
- [0051-styling-system.md](0051-styling-system.md) — design token system / responsive / motion / print (the supplier of the semantic tokens the adopted UI references; where the adoption of a motion library belongs is also on 0051's side)
- [0054-ui-catalog-storybook.md](0054-ui-catalog-storybook.md) — the UI catalog (where the visual specification of adopted components lives)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the `components` kernel (where adopted UI is placed) and the promotion discipline (confining vendor dependence)
- [0011-no-docker.md](0011-no-docker.md) — the presentation-layer role
- [0060-state-management.md](0060-state-management.md) — adopting form state (react-hook-form + zod). Works paired with the form components
- [0053-ui-component-interaction-seam.md](0053-ui-component-interaction-seam.md) — the a11y contract / sanitizer port of rich text (TipTap), and the seams of local UI not bundled in the core, such as DnD (dnd-kit)
- [0153-ci-configuration.md](0153-ci-configuration.md) — the conditions for registering a required check (why the upstream-tracking check is not made mandatory)
- [0072-api-type-generation.md](0072-api-type-generation.md) — a stale copy is turned red by a drift check and a person handles it (the same shape as the ledger's upstream tracking)

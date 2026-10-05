# UI Catalog (Storybook) Policy

As the home of components' visual specifications, **the UI catalog (Storybook) is adopted**. This is **a development-tool choice**, not a functional seam, and this ADR owns it as a subject separate from the test verification methods ([0091](0091-test-verification-methods.md)).

## Status

Accepted

## Context

The portal of [0141](0141-portal-operations.md) is a documentation portal, not a UI catalog, so a separate place is needed for viewing components' visual specifications, usage and state variations side by side. The per-layer READMEs of the `components` kernel narrate responsibilities and design intent, but cannot hold a surface for checking look and interaction on a canvas. This ADR puts that surface on Storybook and defines its division of roles with the READMEs, where stories live, and how external endpoints are handled on surfaces without a server.

## Decision

- **Storybook is adopted in this repository as the UI catalog**. Storybook serves as the catalog of components' visual specifications, usage and state variations
- **Catalog coverage is guaranteed primarily by Storybook, running alongside the narration of the per-layer READMEs of the `components` kernel** ([0021](0021-frontend-responsibility.md) per-package README / [0141](0141-portal-operations.md) portal). The division of roles is: READMEs narrate responsibilities and design intent, Storybook catalogs visual specifications and interaction, and the documentation portal (0141) and the UI catalog are not confused
- **Storybook is the single list of what components exist.** There is no other place to view every screen side by side, so consistency is guaranteed by "no component exists without a story". Do not newly create a component without a story (the same applies under features)
- **`.stories.*` files are co-located with their target component** (story files ride on the co-location of [0027](0027-directory-structure.md))
- Adding dependencies for Storybook itself and its addons goes through **exact pin + `pnpm audit`** ([0004](0004-library-management.md)). Wiring the build into CI is held by [0153](0153-ci-configuration.md) (not decided twice in this ADR)
- **A story shows "what that component is for" in a form readable from the opened canvas.** Do not stop at a single default; make the states the component itself expresses (variant / disabled / invalid / opened, etc.) reachable on the canvas. **A story whose canvas does not reach the state its name promised does not hold up as a catalog**
  - **A surface that appears only on hover is opened by advancing to focus in play.** Capture has no pointer, so a surface left to hover never appears opened in the baseline image even once. That the same surface opens on focus is required by the a11y contract ([0053](0053-ui-component-interaction-seam.md)), and play uses that path
- **Do not embed screen-specific business vocabulary, APIs or routes in stories.** The catalog is a neutral surface referred to by people who use this repository, and examples with business context go in the feature-side stories or the screen implementation
- **The display classification of stories does not decide implementation placement or dependency direction.** Classification is for browsing, and the concrete scheme of `title` is owned by `components/README.md` (not fixed in this ADR). However, **whole-screen stories may compose across features** (an exception to the promotion rule of [0021](0021-frontend-responsibility.md)). This is not classification deciding dependencies but a judgment that grants a verification-only surface permissions separate from product code
- **A whole-screen story is wrapped in the same layout shell as its route.** The story side reproduces the shell that route's layout places, and the heading, hierarchy and reading width the page places. Without reproducing them, spacing and visual weight drift from the real thing, and the story cannot fulfill its purpose of confirming, without fetching, how the screen fits
  - **What is reproduced is not limited to what the layout / page place.** It also includes opening and closing permanent regions that change the body's share (such as a panel that opens at the side), and sections that sit on the static-shell side of `Suspense` outside the view. The former changes the body's width when opened and closed, and the latter, unless placed in the frame, makes the columns look different from the real thing
  - **Side effects raised by seeding for a story are folded on the spot.** Putting values into a store to create the initial state can raise the same notifications and requests as a real operation. Seeding reproduces the initial state and is not an additional user operation, so those are folded before rendering
- **A layout shell that needs different values per story is built as a component, not a decorator.** A decorator can receive values only through `parameters`, and the conditions in effect lose their types. As a component, the conditions can be handled as the story's args with their types intact
- **Automated a11y checks ride on Storybook.** The checks apply to every story, and zero violations is part of the completion criteria for intake (one of the automated checking means of [0100](0100-accessibility-target.md)). The substance of the check is **axe running in the same container as visual regression** ([0091](0091-test-verification-methods.md)); `addon-a11y` is used as an interactive panel for local confirmation

## Subjects per Component

**Stories are counted by subject, with 15 subjects per component as the upper limit in principle.** A subject is one state to be confirmed, and the same subject split by band (PC / tablet / phone) counts as one subject.

The limit is not a number for giving up on coverage but a number for **keeping the catalog within a range that can be surveyed at once**. Screens that need to exceed it (those whose combinations of states are inherently many) **may exceed it with the confirmation of an architect or tech lead**. Do not increase it without confirmation.

## Swapping external endpoints on surfaces without a server

The catalog has no server. **Do not place pressable operations while leaving them in a state that breaks when pressed.** There are two endpoints for swapping, decided by what the counterpart is.

**Only external endpoints are swapped; the subject itself is not.** Faking the wiring or completion of an input field fakes even the correspondence between label and control, leaving nothing to confirm and nothing for the a11y check to examine.

### Server Action — swap the whole module

- The **declaration** of the swap goes in **`.storybook/preview.tsx`**. Extraction reads only this file, so writing it elsewhere has no effect
- **Write the path including the extension.** Omitting it makes resolution fail, and it proceeds with nothing registered even though it is declared (the failure does not surface)
- The **substance** of the swap goes in **`__mocks__/` next to the target** ([0027](0027-directory-structure.md) holds the exception for its placement). An automatic swap with no substance leaves the original module's imports as-is, so the state where `adapters/server` and `config` are loaded in the browser does not go away
- The default return value is **success**. Stories that show how failure looks swap the return value with `mocked()`
- **Endpoints that do not cause a submission also return resolved.** Show that nothing happens on press in a form that does not keep waiting (no permanent pending). This discipline applies to endpoints that show "nothing happens on press"; **only stories whose subject is the in-progress appearance itself hold the appearance right after pressing, with a submission target that never resolves** — the in-progress state is folded when the submission completes, so with a target that returns immediately it ends before capture. The never-resolving submission target is held in one place in `.storybook/lib/` and not created per story
- **Stories of components that have a submit are wrapped in a `form` that has an `action`.** Submitting a `form` without an `action` becomes a GET to the current URL, reloading the whole catalog the moment it is pressed. In the real thing the layout shell hands out the submission target too, so in stories the layout shell hands it out as well
- **Do not add endpoints to production code** for the catalog's sake (such as changing a Server Action to be received via props; the same line as the prohibitions of [0090](0090-testing-strategy.md))

### Route Handler — intercept same-origin `/api/*`

- Stand up browser-side interception in the catalog, and have the catalog itself return the responses of `/api/*`
- Handlers **are not mixed into the home of mocks generated from the contract.** What `/api/*` returns is a display shape assembled by the Route Handler and cannot be generated from the contract. So as not to break that place's premise "only generated artifacts live here", the catalog's hand-written code goes in `.storybook/`
- **Do not swap `fetch` inside a story.** Swapping it means the paths the component is supposed to go through (response validation, failure branches) are not exercised in the catalog
- The assets needed for interception are **not tracked**. The catalog's configuration re-places them from the dependency's own files, and serving is also kept separate from the app's `public/` (verification assets are not mixed into the production served artifacts). Re-placing is held by the configuration rather than the startup command so that the same premise holds even when the tool is invoked directly

## Prohibitions

- ❌ Treating Storybook as a "functional seam" and coupling it to the app's runtime paths or feature flags (it is strictly a development tool = a catalog) (Enforcement: Prose — **partly mechanizable**. Importing `storybook` / `@storybook/*` / `.storybook/` from `src` outside stories could be rejected with `no-restricted-imports`, but no rule exists. Coupling to feature flags is decided by the meaning of the values, not by shape)
- ❌ Confusing the roles of the documentation portal ([0141](0141-portal-operations.md)) and the UI catalog (Storybook), duplicating narrative documentation into Storybook or the visual catalog into the portal (Enforcement: Prose — **not mechanizable**. Whether something is narration or a visual specification is decided by the role of the content, not by the shape of where it lives)
- ❌ Scattering `.stories.*` outside co-location (an aggregate directory, etc.) (follow the co-location of [0027](0027-directory-structure.md)) (Enforcement: scaffold (`pnpm gen`) generates `.stories.tsx` next to the component. Moving after generation and hand-made stories are Prose — **mechanizable** (could be rejected by whether an implementation with the same name exists next to the `.stories.*`; no rule exists))
- ❌ Newly creating a component without a story (Storybook is the single list of what components exist) (Enforcement: scaffold (`pnpm gen`) generates the story together with the component. Hand-made components are Prose — **partly mechanizable**. Whether a `.stories.tsx` exists in a component directory under `src/components` could be rejected at the same scan unit as `pnpm check:ui`, but no rule exists. Under features, which files are components is not decided by naming)
- ❌ Adding Storybook / addon dependencies without exact pin / `pnpm audit` ([0004](0004-library-management.md)) (Enforcement: the `dependency-audit` job (`make audit`) runs `pnpm audit` on PRs that reach the lockfile and rejects high / critical findings that have a fixed version. Exact-pin is Prose — **mechanizable** (could be rejected by whether a version specifier in `package.json` has a range such as `^` / `~`; no rule exists))
- ❌ Swapping `fetch` inside a story to fabricate responses (bypasses the paths the component goes through) (Enforcement: Prose — **mechanizable** (could be rejected by picking up assignments to or spies on `fetch` in `*.stories.tsx` from the syntax tree; no rule exists))
- ❌ Adding hand-written handlers to the home of mocks generated from the contract (Enforcement: the `gen-drift` job (empties the output with `make api-gen`, regenerates, and looks at `git status --porcelain -- src/adapters/gen mocks`) rejects hand-written files added to the home of generated artifacts)
- ❌ Adding endpoints to production code solely for the catalog (Enforcement: Prose — **not mechanizable**. Whether an endpoint exists solely for the catalog is decided by the intent of the side that added it, not by shape)
- ❌ Settling Storybook's version-pinning policy or CI build wiring in this ADR (owned by [0004](0004-library-management.md) / [0153](0153-ci-configuration.md); no double decision) (Enforcement: Prose — **not mechanizable**. Whether a sentence in the ADR settles a policy is decided by the sentence's meaning, not its shape)

## Notes

- Storybook's concrete configuration (builder / framework integration) is outside this ADR's range. The operation of visual regression is owned by [0091](0091-test-verification-methods.md), and adopting Storybook does not decide it
- This ADR is a development-tool choice that is not a functional seam, and is independent of the test layers of [0090](0090-testing-strategy.md) (unit / component / integration / e2e). Settling the test verification methods is owned by [0091](0091-test-verification-methods.md)

## Related ADRs

- [0091-test-verification-methods.md](0091-test-verification-methods.md) — test verification methods (where async RSC goes / automated a11y tests / visual regression)
- [0141-portal-operations.md](0141-portal-operations.md) — the documentation portal (not a UI catalog). Division of roles with Storybook
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — per-package README (the source that runs alongside for catalog coverage)
- [0027-directory-structure.md](0027-directory-structure.md) — co-location (where `.stories.*` go)
- [0004-library-management.md](0004-library-management.md) — exact pin / audit of Storybook / addon dependencies
- [0153-ci-configuration.md](0153-ci-configuration.md) — the owner of wiring the Storybook build into CI

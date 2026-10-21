# UI Component Policy and the Interaction a11y Seam

[0052](0052-ui-component-policy.md) adopts the UI component foundation (shadcn/ui + @tabler/icons-react + complex input components) and bundles complex inputs (date pickers, etc.) as shadcn-family components in the `components` kernel, but what it deals with is "which components to have (whether to bundle)"; **the interaction quality of UI that has interaction** (the a11y seams of keyboard operation, focus management, ARIA, live regions, drag alternatives, etc.) remains a separate subject. This ADR separates its subject from 0052 and bundles into one the **a11y interaction seams** of interaction UI (sanitizer port / WCAG 2.2 drag-alternative interface / the focus and scroll contract of modals, etc.). This ADR owns the interaction a11y contract required in common both of the components 0052 adopts (complex inputs / rich text = TipTap) and of local libraries not bundled in the core (DnD = dnd-kit, etc.).

## Status

Accepted

## Context

Interaction UI divides into the following five, and what this ADR holds differs for each.

- **Complex input UI** (already adopted by 0052) = date pickers and the like are placed in `components` by 0052 as shadcn-family components. This ADR lays down not "may it be included" but the **interaction a11y contract of keyboard operation / focus order / ARIA** for the adopted components
- **Rich text / editor** (adopted) = the core provides a **sanitize interface + display seam** (the sanitizer is named as a swappable port). The editor itself (TipTap) is in actual use
- **Modal / dialog** = the a11y contract (focus trap, Escape and scroll lock mandatory; [0100](0100-accessibility-target.md)) is the default, and whether to adopt route-as-modal (intercepting routes) is under [0040](0040-routing-rendering-strategy.md)
- **Keyboard shortcuts** (excluded) = not adopted, and no registration mechanism is placed either
- **Drag and drop** (library not bundled) = the core provides **an a11y-conformant DnD seam / interface that satisfies the WCAG 2.2 drag alternative**. DnD libraries (dnd-kit, etc.) are not bundled in the core

What these have in common is that **interaction is where a11y accidents occur most often** (focus in modals / drag alternatives in DnD / misfiring shortcuts), tying directly into [0100](0100-accessibility-target.md)'s WCAG 2.x AA target. To leave no room for either the components 0052 adopts or locally adopted libraries to be implemented without an interaction a11y contract, this ADR **always lays down a11y extension points (named seams + a11y contracts)**.

## Decision

### 1. The guiding principle: platform standards and built-ins first (0010 standards conformance)

For interaction UI, **the platform standard (HTML/CSS/DOM built-ins) is the first candidate, ahead of libraries** ([0010](0010-standards-and-non-lockin.md) standards conformance). A library is added, as a use-case-dependent judgment, only when it turns out that built-ins cannot meet the requirement.

- **Vendor-independent justification** ([0010](0010-standards-and-non-lockin.md)): built-ins first is justified not "because the framework recommends it" but on independent grounds specific to the web platform standard — (a) **the browser supplies a11y mechanisms by default**, such as top-layer / focus / `inert` / `::backdrop` (avoiding reinventing the wheel of a homemade focus trap), (b) **zero JS library dependencies = portable to any framework** (0010's operational test "is it justified with the vendor taken out of the justification" = Yes), (c) **minimal dependencies** (no bundle growth). This is also consistent with the shadcn/ui 0052 adopts (Radix = WAI-ARIA-conformant primitives) — the order of priority is to use built-ins first for interactions they can satisfy, and to fill the range built-ins cannot cover with shadcn-family components / local libraries

### 2. The interaction a11y contract for complex input UI

- **Complex input UI such as date pickers, comboboxes and autocomplete is already adopted by [0052](0052-ui-component-policy.md) in the `components` kernel as shadcn-family components**. This ADR lays down not whether to bundle them but the **interaction a11y contract** these adopted components must satisfy
- Under built-ins first (§1), where they can meet the requirement, native inputs (`<input type="date">` / `<datalist>` / `<select>`, etc.) are the first candidate, and shadcn-family components (0052) are used only for complex inputs that native cannot cover
- Whether adopted components or our own implementations, **a11y conformance (keyboard operation / focus order / ARIA / [0100](0100-accessibility-target.md)'s WCAG 2.x AA) is mandatory**, done within the frames of [0050](0050-styling-strategy.md) (Tailwind main axis + limited allowance for CSS Modules; styled-components / emotion not adopted), [0021](0021-frontend-responsibility.md) (kernel placement, naming discipline) and [0004](0004-library-management.md) (exact pin / audit) (the same as 0052's conditions for adoption)

### 3. Rich text / editor = adopt TipTap + sanitizer port + display seam

- **TipTap is adopted as the WYSIWYG editor**. The editor itself is placed in the `components` kernel and follows [0052](0052-ui-component-policy.md)'s placement and exact-pin requirements
- **The reason for adopting it lies not in the editor itself but in the display-side seam needed next to it.** If the path that safely displays what users wrote is **added later, "forgetting to pass through it" has already spread**. It is bundled to put in place, as a real thing, the form that closes that path with types (the port and nominal type below), and this form remains even if the editor itself is swapped
- **The editor itself is needed only when there are fields where long text written by a user is displayed to other users**. Without such fields, you may drop the editor altogether and keep only the sanitizer port. Whether swapped or dropped, the form that must remain (the port and nominal type) does not change
- The extension point (seam) on the "display" side: **the sanitizer that turns untrusted HTML into safe display is treated as a swappable named port (seam)** (rehype/rehype-sanitize / DOMPurify, etc. are implementations of the port, not premises of the core). Rich text display always passes through this sanitizer port
- The sanitizer port is a wrap of an external library and is placed in **the `model` kernel**, following [0021](0021-frontend-responsibility.md)'s criteria for what a kernel accepts (referenced from several places, or wrapping an external library → kernel). The display seam (rendering sanitized content) is placed in `components`
- **The port expresses being sanitized in the type.** It returns the passed value as a nominal type, and the display side accepts only that type. Because it takes no raw HTML string as props, **no path that bypasses the sanitizer exists in either the public API or the implementation**. It is a form that closes "forgetting to pass through it" with types rather than conventions
- **Rendering does not go through an HTML string.** A spec-conformant parser turns the HTML into a tree (hast), the tree is checked against an allowlist, and React elements are built directly from that tree. Checking while still a string is not adopted — malformed markup that the parser corrects slips past checks on the string. This removes the very places that use `dangerouslySetInnerHTML`, creating a state that is not "not used" but "not in a usable form" with respect to [0110](0110-security-operations.md)'s prohibition
- **The sanitizer's allowlist drops the inline `style` attribute.** Bold / italic / lists / headings / links can all be mapped to classes, so there is no reason to let `style` through. **That this design holds has been confirmed in the implementation, and there is no need to open `'unsafe-inline'` in CSP's `style-src-attr` on account of rich text** (an input to [0111](0111-csp-security-headers.md)'s enforce-seam judgment). `class` / `id` are dropped likewise
- Keep **tags the editor can emit ⊆ tags the sanitizer lets through**. If this inclusion breaks, an inconsistency arises where something can be entered but is dropped after saving. The editor's extension set is derived from the allowlist, and **the inclusion is pinned in a test so that adding an extension is detected**. Therefore **`@tiptap/starter-kit` is not adopted and extensions are added individually** — starter-kit pulls in, as a bundle, extensions that emit tags not in the allowlist, so the inclusion cannot be kept
- **Do not co-locate sanitizers with different tolerances in the same package.** The viewer that renders the repository's own committed documents ([`docs-viewer/`](../../docs-viewer/README.md)) needs a broad allowlist that lets tables, code blocks and `class` through, but placing it in the same package as the app would leave only conventions to stop the app from importing the broader one. It is placed in a separate package, making it structurally unreachable ([0020](0020-adopted-architecture.md))
- **Connection with the XSS rules**: **the rule itself** — `dangerouslySetInnerHTML` forbidden in principle and the sanitizer mandatory — **is owned by [0110](0110-security-operations.md)**. This ADR lays down the structural side, "name the sanitizer as a swappable port", and 0110 is the authority for the rule (no double decision)

### 4. Modal / dialog = the a11y contract by default + WAI-ARIA-conformant primitives as the means

- **The a11y contract a modal must satisfy is the default** ([0100](0100-accessibility-target.md) WCAG 2.x AA): focus trap / close on Escape / background scroll lock / focus return / association of name and description. **The contract is fixed rather than the means** because, as long as the contract is satisfied, the means can be swapped
- **Overlays are an area that §1's built-ins first does not reach.** The native modal element supplies top-layer and backdrop, but **background scroll lock, focus return and declarative control of opening and closing** end up being filled in on the component side, and the result of filling them in is the same as what the WAI-ARIA-conformant primitives [0052](0052-ui-component-policy.md) adopts already supply. **Re-filling them ourselves to satisfy the contract is reinvention**
- **This is not an exception to built-ins first but the result of applying it.** The overlay verdict is the result of actually following the order "a library only when it turns out that built-ins cannot meet the requirement" (§1); for a single control, opening and closing, and local scrolling, built-ins win instead. **Judge per area, and do not extend one conclusion to everything**
- The decision axis is "how much has to be filled in to satisfy the contract". Where the amount to fill in is negligible, native is taken
- **UI-bound behavioral hooks such as focus-trap / scroll-lock are not promoted to `capabilities` but co-located with their component** ([0022](0022-capabilities-kernel.md): they are UI behavior, not runtime capabilities)
- **Whether to adopt route-as-modal (intercepting routes `(.)` / parallel routes `@modal`) is not settled in this ADR**. It is a routing decision that ripples into URL design and falls under [0040](0040-routing-rendering-strategy.md)

### 5. Keyboard shortcuts = excluded

- **Global keyboard shortcuts are not adopted** (exclusion). Scattered after-the-fact implementations cause accidents such as misfiring while an input has focus, but that concerns the case of adopting them; the core does not place the mechanism either
- The keyboard operability of individual UI (tab order / Enter, Escape, etc.) is part of the a11y contract, with [0100](0100-accessibility-target.md) (WCAG 2.x AA) as the authority. What this item excludes is only **a global shortcut mechanism**
- **Key operations that complete within the component's own UI are an exception and may be placed in the component** (a hotkey that moves focus into a region the component itself emitted, etc.). What is excluded is a general-purpose registration mechanism that binds arbitrary operations to arbitrary keys
- **A component that displays a "hint" for key operations may exist.** UI that displays pairs of what happens and which key is a pure display primitive with neither registration nor `keydown` listening, not a mechanism. However, **`components` cannot guarantee that this hint actually works** — the hint component and the wiring are in different layers (`components` cannot import `capabilities`), and what binds a key to a handler is `features` or above, which can import both. Therefore **the side that puts up the hint bears responsibility for it being executable with that key**. Do not put operations that cannot be executed from the keyboard into a hint

### 6. Drag and drop = library not bundled + WCAG 2.2 drag-alternative seam

- **DnD libraries (dnd-kit, etc.) are not bundled in the core** (the core scope of [0052](0052-ui-component-policy.md)). The native HTML Drag and Drop API is the first candidate (§1)
- **File drop can be satisfied with the native API, so it is implemented in the core.** If the receiving endpoint is built as the `label` of an `input type="file"`, dropping becomes an accelerator, selection is also possible by pressing, and the `input` is reachable by tab and opens with Enter. Dropped files are written back to the `input`'s `files` and ride on native form submission too. It is **a form that structurally satisfies the drag alternative without needing a library**, not something to wait on a library for. What needs a library is complex DnD such as reordering
- Any DnD adopted must have **an a11y contract that satisfies WCAG 2.2 Dragging Movements (SC 2.5.7)** = **always provide an alternative operation by a single pointer / keyboard other than dragging**. This "drag alternative" is treated as a named seam, and a feature that adopts DnD comes with an implementation of the alternative path (DnD without an a11y contract is forbidden; §Prohibitions)
- DnD behavior is UI-bound, so like focus-trap it is placed in component co-location + feature composition (the same shape as [0022](0022-capabilities-kernel.md)'s policy on UI behavior hooks). The a11y target is [0100](0100-accessibility-target.md)

### 7. Scope of materializing extension points in code

Extension points are **placed in code only in a form accompanied by an implementation**. Do not place only an empty interface / port definition — an abstraction without an implementation is always rewritten at the point it gets implemented.

- **The sanitizer port is already materialized in the `model` kernel** (§3). Because the editor was adopted, the display side also comes with an implementation
- **No shortcut registry is placed** (§5). This ADR records "name + home + a11y contract", and it is materialized at the point of adoption
- **The DnD drag alternative is already materialized as a component implementation within the range that needs no library** (§6). The alternative interface for DnD that needs a library is placed together with its implementation at the point the library is adopted

### State a component holds, and what is passed from outside

The boundary is aligned with the responsibilities **WAI-ARIA APG** defines. APG specifies, per role, keyboard operation and focus management as **the component's responsibility**.

| The component holds | Passed from outside |
| --- | --- |
| Open/closed / position of the highlight / where focus is / a value mid-input / whether a transition is in progress | What to show (data) / whether it can be done (permission) / what happens as a result of pressing (action, callback) |

The test is **"is it state needed only for the continuity of look and interaction?"**. Values decided only by business outcomes are passed from outside ([0070](0070-backend-role-separation.md)).

**Control is held by the component by default and opened only to the calls that come to need it.** `value` / `onChange` are not required from the start. This is the form HTML input elements take, formalized as Control Props. No endpoint for swapping the behavior itself (State Reducer) is provided — it is a mechanism for libraries and excessive for in-app components.

### One role per operation

**A component's granularity is decided by role.** If one element serves two operations, it is two components. Assistive technology sees only the role and the accessible name, and combined operations can have only one name.

- **Do not make a `link` that does not navigate when pressed.** If it does not navigate, it is a `button` (a path that cannot proceed is expressed by a disabled `button`)
- **Something that opens another place when pressed has `aria-expanded`.** When what opens and closes is outside itself, it is an operation, not a display
- **Give an accessible name to symbol-only operations.** In a list where the same symbol repeats, include the target in the name to distinguish them

### Narrow how much is shown at once, in stages

Information and operations show **only what is needed for the judgment at that moment**, sending the rest to the next stage (progressive disclosure). Opening and closing, stepping through stages and expanding details are implementations of this principle, not decoration.

**Only "things that can be decided later" may be hidden**. Information that **changes the judgment on the spot** — such as whether it is possible, the price, or whether it can be undone — is not hidden. Even when collapsing, leave in the heading a summary that lets the judgment be completed while it stays closed.

### Overlays that stay until closed are closed by the back action

Things that overlay and stay until closed (dialog / alert dialog / sheet / drawer) **push one history entry when opened and close only themselves on the back action**. When closed by the close action, the pushed entry is popped to cancel out the change in history.

The reason is that **the meaning of the back action is "remove what is currently overlaid"**. Without pushing, going back while something is overlaid moves the whole screen to the previous page. The screen being read disappears, and anything being entered on the overlay is lost. Especially in touch environments, the back action is the first thing tried as a way to close an overlay.

**The targets are only things that stay until closed**. popover / dropdown / tooltip / hover card close on the next operation, so they do not span a back action. Pushing history for these too would dilute the meaning of one back action to "close one of them", and the screen could no longer go back.

**When closed by an operation that moves the screen, the pushed entry is not popped.** Otherwise, when going back from the destination, the overlay that was supposed to be closed would reappear. The decision is made with the URL at the time of pushing and a marker in the history.

**Instead, when moving the screen from inside an overlay, move by replacing rather than pushing more.** The one pushed entry is a duplicate of the current location, and leaving it as a back destination makes one back action spin idle (the URL does not change, so the screen does not move either). If the moving side replaces, that one entry is overwritten by the destination and disappears. Links specify `replace`, and a Server Action's `redirect` specifies `RedirectType.replace`.

### A dropdown's menu is modal by default

While open, `DropdownMenu` applies `aria-hidden` to the background and stops pointer-events and scrolling (Radix's `modal` default). **This default is adopted as this repository's decision.**

Making it non-modal loses three things, all belonging to the a11y contract [0100](0100-accessibility-target.md) requires — confining focus while the menu is open, fixing the background scroll, and **returning focus to the trigger when closed by pressing outside**. The last one is lost only in non-modal (Radix does not return focus when closed by an outside interaction).

**Whether to block and whether to push history are separate axes.** Modal decides the handling of focus and scrolling; what decides the targets that push history is the previous section's "does it stay until closed". A menu blocks the background but closes on the next operation, so it does not push history.

As a consequence, focusable elements remain under `aria-hidden`. axe's `aria-hidden-focus` reports this as a violation, but focus is confined by the focus scope, so it cannot actually be reached. **The declaration disabling it on the basis of this decision, and its reversal conditions, are held by [`vrt/lib/a11y-rules.ts`](../../vrt/lib/a11y-rules.ts).**

### Swapping structure is received through slots, not props

When the using side needs to rearrange the inner structure, **do not express the rearrangement as branches in props**. Open the place to swap as `children` or `asChild`. Expressing it as branches allows only the anticipated combinations, and props grow every time something unanticipated comes along.

**Splitting a component into parent and children (compound) is only for when the children have no meaning on their own and the parent decides their order and state**. If a child stands on its own, it is an independent component, and no parent is needed.

## Prohibitions

- ❌ Bundling in the core local interaction UI that needs a library (DnD such as reordering) without an implementation that uses it (follow the core scope of [0052](0052-ui-component-policy.md); complex inputs and rich text are already adopted and outside this item) (Enforcement: the `dead-code` job (`pnpm knip`) rejects dependencies imported from nowhere. Something merely wrapped in a `src/components` component with no screen that uses it is Prose — **not mechanizable**. Being unused is normal for `src/components` as a public surface, and whether it comes with an implementation that uses it is not decided by shape)
- ❌ **Reinventing** with our own implementation / a library what native / built-ins (native input / `details` / `overflow` / the native DnD API) can satisfy (breaks §1 built-ins first) (Enforcement: Prose — **not mechanizable**. Whether built-ins can satisfy the requirement is the judgment of the requirement itself, not decided by the shape of the code)
- ❌ Conversely, in an area where built-ins turned out unable to meet the requirement, re-filling the contract ourselves (focus / scroll lock for overlays falls under this; §4) (Enforcement: Prose — **partly mechanizable**. Hand-written forms of fixing body scroll or capturing Tab (such as assigning to `document.body.style.overflow`) can be picked up statically, but no rule exists. Which areas built-ins fall short in is a per-area verdict, not decided by shape)
- ❌ **Implementing** an adopted interaction **without the a11y contract ([0100](0100-accessibility-target.md))** (focus / scroll-lock / Escape for modals, the WCAG 2.2 drag alternative for DnD, keyboard / ARIA for complex inputs) (Enforcement: Biome's a11y rules and the `a11y` job (`make a11y`), which runs axe on every story, reject static ARIA and role violations. Behaviors such as focus confinement, Escape and drag alternatives are Prose — **not mechanizable**. Behavior in response to interaction does not appear in the shape of rendering, and whether to write an interaction test remains a per-component judgment)
- ❌ Using `dangerouslySetInnerHTML` for rich text display **without passing through the sanitizer port** (the authority for the rule is [0110](0110-security-operations.md))
- ❌ **Settling in this ADR whether to adopt route-as-modal (intercepting / parallel routes)** (a routing decision = under [0040](0040-routing-rendering-strategy.md)) (Enforcement: Prose — **not mechanizable**. Whether a sentence in the ADR settles adoption is decided by the sentence's meaning, not its shape)
- ❌ Promoting UI-bound behavioral hooks such as focus-trap, scroll-lock and DnD to `capabilities` ([0022](0022-capabilities-kernel.md): UI behavior is co-located with the component) (Enforcement: Prose — **not mechanizable**. Whether a hook is a runtime capability or UI behavior is decided by the meaning of the behavior, not by the shape of where it lives)
- ❌ Placing extension points that were only to be recorded (shortcut registry / DnD drag-alternative interface) in code as empty interface definitions (§7) (Enforcement: the `dead-code` job (`pnpm knip`) rejects exports not called in internal layers. An empty interface placed in the public surface `src/components` is Prose — **not mechanizable**. Being unused is normal for a public surface, and whether it comes with an implementation is not decided until a using side appears)

## Notes

- **Division of subjects with 0052**: [0052](0052-ui-component-policy.md) owns "which UI components to have (adoption, whether to bundle)", and this ADR owns "the interaction a11y quality of the interaction UI we have (seams + contracts)". The two subjects do not overlap. Granular day-to-day rules are held by 0110 (XSS) / 0100 (a11y checks) / [docs/rules.md](../rules.md)
- **Adoption categories**: rich text (TipTap) = adopted (§3). DnD (dnd-kit) = not bundled in the core, adopted locally. Keyboard shortcuts = excluded (§5). In every case the core keeps the seams and a11y contracts, and libraries are placed within the frames of [0010](0010-standards-and-non-lockin.md) (vendor-independent justification + swappable behind a kernel boundary, no direct vendor references scattered across features/components) / [0004](0004-library-management.md) (exact-pin / `pnpm audit`). §1 built-ins first and the a11y contracts of §3–6 do not change by adoption category

## Related ADRs

- [0052-ui-component-policy.md](0052-ui-component-policy.md) — adoption of UI components and whether to bundle them (shadcn/ui + Tabler icons + complex inputs + rich text = adopted / DnD libraries = not bundled). This ADR owns, as a separate subject, the interaction a11y quality those components satisfy
- [0100-accessibility-target.md](0100-accessibility-target.md) — WCAG 2.x AA / biome a11y / manual checks (the authority for the a11y contracts of all interactions)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — jurisdiction over adopting route-as-modal (intercepting / parallel routes) (not settled in this ADR)
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — standards conformance + non-lock-in (the foundation of the vendor-independent justification for §1 built-ins first)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — the policy that UI behavior hooks are co-located with components (a global shortcut mechanism is excluded in §5)
- [0111-csp-security-headers.md](0111-csp-security-headers.md) — whether the sanitizer can drop the `style` attribute becomes an input to the CSP enforce-seam judgment (§3)
- [0110-security-operations.md](0110-security-operations.md) — the XSS / sanitize rules (`dangerouslySetInnerHTML` forbidden + sanitizer mandatory; the authority for the sanitizer port's rules)
- [0050-styling-strategy.md](0050-styling-strategy.md) — Tailwind main axis + limited allowance for CSS Modules (styled-components / emotion not adopted; the styling means of the adopted UI)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — kernel placement, naming discipline, acceptance criteria (the basis for the physical placement of the sanitizer port / display seam)
- [0020-adopted-architecture.md](0020-adopted-architecture.md) — the principle of guaranteeing through structure (the basis for separating sanitizers with different tolerances by a package boundary)
- [0004-library-management.md](0004-library-management.md) — exact pin / audit (the frame when adopting interaction UI libraries)

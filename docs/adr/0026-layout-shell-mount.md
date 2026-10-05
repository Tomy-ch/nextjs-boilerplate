# Mounting Cross-Cutting UI / Providers in layout (App Shell Composition)

This ADR sets **the route by which** `<Toaster/>`, the global nav / footer and the various Providers (theme / capabilities / policy) **are mounted in the root layout**. The import target of [0025](0025-app-layer-elements.md)'s `app/route-segment` is `features` only, and [0022](0022-capabilities-kernel.md)'s Provider mount exception is limited to `capabilities`, so those alone do not allow placing the cross-cutting UI shell and Providers in a layout.

This ADR resolves this by **generalizing the layout's mount exception** and distinguishing `layout` from `page` (no new kernel is needed).

## Status

Accepted

## Context

The toast queue state and the `<Toaster/>` UI are "UI state (not business state)", so they can be placed in `components` ([0022](0022-capabilities-kernel.md)'s principle "what is tightly bound to UI belongs with the component"). But **the route for mounting** that `<Toaster/>`, the layout shell (nav / footer) and the Providers **in the root `layout.tsx`** does not exist under an `app → features only` matrix and a capabilities-only mount exception.

## Decision: Generalize the layout Mount Exception + Distinguish layout / page

Among `app/route-segment` ([0025](0025-app-layer-elements.md)), **`layout.tsx` (especially the root)** may **thinly mount** the cross-cutting UI shell and Providers:

- The cross-cutting UI shell (nav / footer / `<Toaster/>`) from **`components`**
- Providers from `components` / `capabilities` ([0022](0022-capabilities-kernel.md)) / policy seams ([0031](0031-policy-state-supply.md))

Constraint = **placement only**. **Placing** `<ThemeProvider><Toaster/>{children}</ThemeProvider>` **is a thin mount (allowed)**; calling hooks and assembling data in a layout is **logic (not allowed = the feature's job)**.

- **`page.tsx` is `features` only** (unchanged)
- **The shell header's height is not measured but imposed as a constant** (`ADMIN_SHELL_HEADER_HEIGHT`). **Reversal condition: the header's height comes to vary with its contents** — when it stops being "a quantity that can be decided", because navigation wraps or rows become variable and so on. Until then, as long as it is imposed, the transcribed value and the rendering do not drift, and a measuring shape would hand out 0 between SSR and the first render, replacing it with a mechanism that is wrong until it learns a quantity it could know. **"On the same screen the band's height is measured, yet the header's is not, which is inconsistent" is not the condition** — the band wraps according to the amount of its contents, so there is no way to know it other than measuring; it is a different kind of quantity
- Basis: the root layout is "the composition point of the **app shell** that belongs to no feature (html / body, global Providers, nav / footer / toaster)", and differs in nature from `page.tsx` (= a screen = one feature)
- **The root layout wraps the screen body (`children`) in one element it renders itself.** Hydration proceeds separately per `<Suspense>` boundary, and when the effect of an island hydrated earlier rewrites, from outside React, the DOM of a side not yet hydrated (libraries that trap focus or make the background inert do this), React arriving later reports it as a mismatch. If the target of the rewrite is an element the root layout renders, that element is outside the boundaries and hydrated in the first commit, so whenever the island runs, its target is already hydrated. The shape of "having the target side announce that it has been hydrated" is not adopted — when the rewriting party is a library, there is no channel for it to emit that signal. Waiting on a clock (`setTimeout` / `requestAnimationFrame`, etc.) is not adopted either (measurements of why that misses are in [docs/design/rendering.md](../design/rendering.md))

### Where Cross-Cutting UI State Belongs (Settled Together with the Mount)

- **The toast queue** → `components` (UI state, Provider + `useToast()`). Features call `useToast().show()` through `features → components` (already allowed)
- **Theme** → a Provider in `capabilities` / `components`

### A route group is the unit of the shell, and also the boundary of client state

Splitting route groups splits layout shells. **A transition crossing that boundary unmounts the layouts that are not shared**
(what a client-side transition keeps is only the shared layout). So the state held by a Provider mounted in that layout
is not carried across the boundary. That Cache Components ([0041](0041-cache-components-decision.md))
sometimes keeps the previous route's tree after a transition is an optimization on the router side, not a guarantee that state survives
across the boundary. The design does not depend on it.

**This is not a defect but the flip side of using route groups as the unit of a journey.** State that only means something
inside a journey may be lost once that journey is left. The reason for splitting layout shells may be
**either a difference in how things should look or a difference in when they are rendered** ([0040](0040-routing-rendering-strategy.md)) —
whichever it is split by, the boundary still becomes the boundary of a journey.

- **A difference in how things should look** means the audience and the navigation differ. When the audience differs, such as users versus
  administrators, split the shell itself (`AppShell` / `AdminShell`) rather than holding both in one shell with branches. Holding them makes it
  impossible to tell which navigation appears on which screen without reading the shell
- **A difference in when they are rendered** means wanting to fix what is underneath at build time. To fix it, the layout shell must drop down to where it touches neither the backend
  nor cookies ([0040](0040-routing-rendering-strategy.md)). If the layout shell
  needs fetching at request time, move the screen to be fixed outside that layout shell

Therefore:

- What may be mounted in a group's `layout.tsx` is only **state that closes within that journey**
- If state needs to survive across a boundary, **the crossing itself is part of the same journey**. In that case,
  gather the two under a parent route group and put the Provider in the parent's `layout.tsx`. Raising it to the root layout is
  the last resort; it lifts state that closes within one journey to global (see "Prohibitions" below)
- **Which one was chosen is written in that layout shell's specification.** Whether losing it was accepted, or crossing was
  judged necessary, cannot be read from the deliverable

### Screens that place breadcrumbs (the screen owns them, not the layout shell)

Breadcrumbs are **not something a layout shell places uniformly on every screen**. Only screens that meet the following condition place them.

- **They have an ancestor that cannot be reached in one step from the global nav** (= the hierarchy is two or more levels)

Therefore they are not placed on root screens, on screens the nav points at directly, or in **linear flows** (flows that advance through steps in order and do not expect going back, such as input → confirmation → completion). The first two would merely duplicate the nav's navigation, and in a linear flow showing "places you can go back to" becomes a path for abandoning. Step progress is held by `Stepper`.

- **On a screen with multiple ways to reach it, show the hierarchy of the site structure, not the path taken** (whether entered from a list or from a filter, the same `トップ > 一覧 > 1 件`)
- **The owner of the contents is the screen.** No layout shell (`AppShell` / `AdminShell` or any other shell) holds breadcrumb contents. Which hierarchy to show depends on values the screen has (the name of an item, etc.), and if the layout shell knew it, the layout shell would hold per-screen branches
- **The only input a layout shell may receive is a slot filled by a parallel route of the same shape as the screen (`@breadcrumb`, etc.).** The layout shell holds the position, and the parallel route assembles the contents per screen, so the owner remains the screen. The layout shell does not hold an input for assembling the contents itself (a shape in which the layout shell receives an array of the hierarchy or the current location and renders it)

Breadcrumbs are not a WCAG AA requirement (SC 2.4.8 Location is AAA; [0100](0100-accessibility-target.md)). So the above is not fulfilling an a11y requirement but **a convention for keeping the information structure consistent**.

## Prohibitions

- ❌ `page.tsx` directly mounting cross-cutting UI / Providers (the mount exception is limited to `layout.tsx`) (Enforcement: Prose — **mechanizable** (declare `src/app/**/page.tsx` as a category of `APP_ELEMENTS` and put `components` / `capabilities` / `stores` in `forbidden`. No rule exists))
- ❌ Calling hooks + wiring data in `layout.tsx` (mount = placement only; the feature does composition) (Enforcement: Prose — **partly mechanizable**. Hook calls in `layout.tsx` could be caught as calls starting with `use`, but no rule exists. Data wiring is decided by how fetching is used and cannot be expressed as a set of imports)
- ❌ A layout shell (any shell) holding breadcrumb contents, and placing breadcrumbs on a screen whose hierarchy is one level. A layout shell receiving a slot filled by a parallel route of the same shape as the screen does not count as holding contents (Enforcement: Prose — **not mechanizable**. Whether a layout shell's input only receives a parallel route's slot or assembles the contents is decided by how it is passed, not by the props' type. Whether a screen's hierarchy is one level is decided by its relation to the global nav and not by the shape of the code)
- ❌ Holding surfaces for different audiences in one shell with branches (split the shell) (Enforcement: Prose — **not mechanizable**. Whether the audiences differ is decided by the meaning of the screens, not by the shape of the branches inside the shell)
- ❌ Holding temporary UI state that would be fine locally (a display flag for a one-off toast, etc.) as global state in the shell mount layer. UI state that should be shared across features goes in `stores` (Zustand), which [0060](0060-state-management.md) adopted (Enforcement: Prose — **not mechanizable**. Whether state is fine locally is a judgment about how it is used and is not decided by the shape of the code)

## Related ADRs

- [0025-app-layer-elements.md](0025-app-layer-elements.md) — `app/route-segment` (layout / page; this ADR subdivides the layout mount)
- [0022-capabilities-kernel.md](0022-capabilities-kernel.md) — the Provider mount exception (this ADR generalizes it from capabilities only)
- [0021-frontend-responsibility.md](0021-frontend-responsibility.md) — the dependency matrix (the layout mount exception in the `app/route-segment` row)
- [0031-policy-state-supply.md](0031-policy-state-supply.md) — policy Providers (layout mount when adopting a shape that needs a Provider for reactive supply)
- [0040-routing-rendering-strategy.md](0040-routing-rendering-strategy.md) — the rendering mode is decided for the whole route (the counterpart of the decision to split layout shells)
- [0041-cache-components-decision.md](0041-cache-components-decision.md) — the change in transition semantics (what the design does not rely on for carrying state over)
- [0050-styling-strategy.md](0050-styling-strategy.md) — theme / dark mode (a target of Provider mounts)
- [0080-error-handling.md](0080-error-handling.md) / [0052-ui-component-policy.md](0052-ui-component-policy.md) — where the toast UI belongs

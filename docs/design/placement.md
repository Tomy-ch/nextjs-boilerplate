# Deciding Placement

This is a procedure for deciding **where to put** something new (display, a hook, client state).

**The decision itself is not held here.** Layer responsibilities are owned by [ADR 0021](../adr/0021-frontend-responsibility.md), physical placement by [ADR 0027](../adr/0027-directory-structure.md), mounting into the layout shell by [ADR 0026](../adr/0026-layout-shell-mount.md), and what each kernel accepts by the per-layer READMEs. What this page holds is only **the order in which to look them up** and **where the lookup is easy to get wrong**. When they disagree, the ADR wins.

## One Question That Comes First

**Does it carry the subject matter's vocabulary?**

If it does, it cannot go into `components` however you walk the layers. `components` is the side that survives sample removal, and the residue check (`DANGLING_PATTERN` in `scripts/setup/remove-sample/sample-manifest.ts`) rejects the subject matter's words. **Settling this first cuts the remaining branches in half.**

## Display (UI)

```text
Does it carry subject-matter vocabulary?
├─ No → components
│   ├─ Position and count are fixed (layout-shell components)    → shell/
│   ├─ Knows the backend contract                                → app-starter/
│   ├─ Spans roles but does not know the contract                → patterns/
│   └─ Its role is closed                                        → design-system/<role>/<component>/
└─ Yes → features (cannot be promoted to a kernel)
    ├─ Used by one screen only                    → features/<name>/<screen>/ui/<part>/
    ├─ Used by several screens of the same feature → features/<name>/ui/<part>/
    └─ Used by other features too                 → features/<name>/facade/<part>/
```

- The divisions of `components` are owned by [`components/README.md`](../../src/components/README.md)
- The three levels inside a feature are owned by the co-location policy of [ADR 0027](../adr/0027-directory-structure.md), and the conditions for `facade/` by [ADR 0021](../adr/0021-frontend-responsibility.md), on UI that carries subject-matter vocabulary and so has no kernel to be promoted to
- **Promote only once it is actually used.** Do not promote ahead of time because "it looks like it will be used". When the users drop back to one, move it back down

## Hooks

```text
What does it depend on?
├─ A browser capability (media query / storage / clipboard, etc.)
│   ├─ Used by several features                → capabilities/
│   └─ Tied closely to one component           → co-located in that component's directory
└─ A screen's own needs                        → that screen (features/<name>/<screen>/)
```

- What `capabilities` accepts is owned by [`capabilities/README.md`](../../src/capabilities/README.md)
- **Behavior hooks tied closely to UI (focus traps, scroll control, observing gestures and the like) are not `capabilities`.** Put them next to that component ([ADR 0022](../adr/0022-capabilities-kernel.md))
- `components` cannot import `capabilities`. A hook that a component in `components` needs goes next to that component

## Client State

```text
Who holds it?
├─ Read and written by several features             → stores/
├─ Cross-cutting UI's own state (queue, open/close)  → components (that component holds it, Provider included)
└─ Closed within a single feature                   → inside that feature (local state)
```

- Owned by [ADR 0023](../adr/0023-stores-kernel.md) and [ADR 0060](../adr/0060-state-management.md)
- The shape in which cross-cutting UI holds its own state is settled by [ADR 0026](../adr/0026-layout-shell-mount.md), where it decides which side owns that state together with the mount
- **What cannot be rebuilt from the server's response is held by the side that was showing it.** The material for an undo (the item that disappeared, and the order at the moment it disappeared) is the typical case: the item that disappeared is no longer in the response, and the order is the screen's appearance itself. Do not try to restore the previous state from the response; remember it as display-side state

## Where the Lookup Goes Wrong

### `components` cannot import `stores`

In the dependency matrix (`architecture.ts`), `components` is allowed only `model` and `errors`. So **UI that touches a particular piece of state cannot go into `components`**. Starting from "it is UI, so `components`" gets stuck here.

For the same reason, `components` cannot import `capabilities` either.

### Some things cannot be promoted

The promotion table of [ADR 0021](../adr/0021-frontend-responsibility.md) says "UI → `components`", but **that row cannot be used for UI that carries the subject matter's vocabulary**. Only when several features need it with nowhere to promote it to is `facade/` used.

### Promoting on "it looks like it will be used" never comes back

What is promoted on a prediction is moved back down by nobody, even when the prediction misses. Making **two or more actually using it now** the condition makes the decision observable. This is why [ADR 0027](../adr/0027-directory-structure.md) forbids the "planned for reuse" axis; deciding on present facts does not fall under that prohibition.

### What goes into the layout shell is inserted through a props slot

When you want to add a cross-cutting interaction, flipping the layout shell itself to the client side sends everything the layout shell imports to the browser. Open a slot in the layout shell and pass a small component into it ([rendering.md](rendering.md), [ADR 0026](../adr/0026-layout-shell-mount.md)).

### Even after an island is split out, one place decides how the row looks

When only one of the elements placed in the same row carries interaction, that one is split into a separate file as a Client Island ([rendering.md](rendering.md)). Even when the files split, **keep the declaration of how the row looks in one place** — for a row of options, the one file that defines the row holds the look of every element, and the island reads it. If the island holds its own look, the same row is decided in two places, and the day only one of them is fixed, they drift apart.

### `features` do not reference each other directly

Do not resolve it by importing the other feature's internals. Only the other feature's `facade/` may be used, and only when there is no kernel to promote it to.

## Questions to Return to When Unsure

1. **Does it carry the subject matter's vocabulary?** — if so, `components` drops out
2. **What actually uses it right now?** — decide on present facts, not predictions
3. **Can the kernel it would be promoted to accept it?** — if not, that fact is what decides the placement

If answering all three still does not decide it, **the way things are divided may itself be wrong**. Before adding another location, question how the feature is cut or how fine-grained the components are.

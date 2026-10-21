# Drawer

## Purpose

Opens a modal panel that slides out from a screen edge and can also be closed by drag. Use it for auxiliary information or filter surfaces designed around touch interaction.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Drawer` | The client-side root that manages the open state, drag, the focus trap and Escape. `direction` chooses the direction it slides out from. |
| `DrawerTrigger` | The trigger that opens the Drawer. When using `Button` or a link, compose it with `asChild`. |
| `DrawerContent` | Renders the drawer body together with the overlay and Portal. Only for `bottom` does a grab handle appear at the top edge. |
| `DrawerClose` | The action that closes the drawer. Used for cancel / close in the footer. |
| `DrawerHeader` | The area that groups the title and description. For `top` / `bottom` it is centered on small viewports. |
| `DrawerTitle` | The title that becomes the drawer's accessible name. |
| `DrawerDescription` | The body text explaining the drawer's purpose or content. |
| `DrawerFooter` | The area that lays out actions. It handles only placement and holds no actions itself. |
| `DrawerOverlay` | The overlay covering the background. `DrawerContent` renders it internally. |
| `DrawerPortal` | The Portal it renders into. `DrawerContent` uses it internally. |

`DRAWER_DIRECTION` and `DrawerDirection` are exported from `drawer.definition.ts`. That definition is the owner of the values `direction` can take; callers do not write strings such as `"bottom"` directly.

## Use Cases

- Pulling filter conditions or auxiliary information up from the bottom edge on a small viewport
- Touch-first paths where closing by grabbing is naturally expected

## Responsibility Boundaries

It is a client island that needs hydration for following the drag, inertia and deciding when to close. It cannot be rendered directly from a Server Component. When the content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

While open it holds one history entry, and **the back action closes only itself** ([0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)). It pushes only a history entry for the same URL; the URL itself does not change.

It owns no display text, fetching, saving, business decisions, or the choice of whether to put the open state in the URL. `direction` decides only the direction it slides out from; the decision to switch between a drawer and an always-visible display depending on viewport width belongs to the feature.

It does not handle scrolling when the content exceeds the height. When needed, the caller specifies overflow with `className`. Drag and content scrolling can conflict, so when creating a scrolling area, check the interaction on a real device.

`DrawerContent` always has a `DrawerTitle` as a child for its accessible name. Add a `DrawerDescription` when a description is needed, and specify `aria-describedby={undefined}` explicitly when it is not. The grab handle that appears for `bottom` is decorative and hidden from assistive technology with `aria-hidden`.

### `Sheet` vs This Component

Both are modals fixed to a screen edge, and the focus trap and Escape work the same way. The basis for choosing is the interaction method.

| | `Drawer` | `Sheet` |
| --- | --- | --- |
| Close by drag | Yes | No |
| Grab handle | For `bottom` | None |
| Intended interaction | Touch first | pointer / keyboard |
| Implementation | vaul | Radix Dialog |

If drag is not needed, use `Sheet`. Using both on the same screen makes the interaction methods inconsistent, so the feature decides which one is the default.

### `dismissible={false}` blocks every way to close

Setting `dismissible` to `false` stops it from closing not only by drag and background interaction but **also by Escape and `DrawerClose`**. The implementation ignores changes in the closing direction at the entry point of `onOpenChange`, so no internal way to close remains.

When specifying this, the caller controls opening / closing with `open` / `onOpenChange` and decides the closing conditions itself. Specifying it without providing a way to close leaves the user unable to operate.

The vendor is currently vaul (Radix Dialog internally), but the public API contains no vendor name.

## Storybook and Tests

Storybook checks the default opening / closing, the four directions `bottom` / `top` / `left` / `right`, placing form components in the content as a filter surface, combining `dismissible={false}` with control of `open`, and having no description. Following the drag needs checking on a real device, so Storybook's scope extends to placement, the grab handle and the opening / closing composition.

The tests check that the content is not rendered until opened, the association of title and description, that the semantics are `dialog` rather than `alertdialog`, the slide-out direction by default and with `direction`, that the grab handle is hidden from assistive technology, that while open the background including the trigger is hidden, that the trigger's `aria-controls` points at the id of an existing dialog, closing with `DrawerClose` and Escape, that with `dismissible={false}` it does not close and can be closed only by controlling `open`, explicit `DrawerPortal` / `DrawerOverlay`, and the automated a11y check. The Portal target lies outside the render `container`, so `baseElement` is passed to the automated a11y check.

jsdom lacks `matchMedia`, which vaul refers to when opening, so the tests stub it. Removing that dependency from the implementation is not the approach taken.

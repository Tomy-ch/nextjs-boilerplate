# AdminShell

## Purpose

Builds the outer frame of admin screens. It groups the side navigation list, the header, the skip link and `main`, and places them in the same position on every admin screen.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AdminShell` | Outer frame with the side navigation list / header / skip link / `main`. |
| `AdminShellNav` | List that lays out navigation links per group and marks the screen currently open. |
| `AdminShellMenu` | Overlay that collapses the side list below `lg`. |
| `AdminShellNavToggle` | Control that collapses and expands the side list. |
| `AdminShellNavStateProvider` / `useAdminShellNav` | Holds the side list's open state and exposes it as an attribute of the outer frame. |

`admin-shell.definition.ts` holds the types for navigation links and their groups (`AdminShellNavItem` / `AdminShellNavGroup`), the `id` of `main`, and the header height.

## Use Cases

Use it once, in the layout of the admin route group. Where the layout shell is mounted is decided by [0026](../../../../docs/adr/0026-layout-shell-mount.md).

The hierarchy down to the current location is passed to `breadcrumb`. The layout shell owns the position; the passing side builds the contents.

## Responsibility Boundaries

It is a separate layout shell from the user-facing [`AppShell`](../app-shell/README.md). Merging them into one would make the layout shell carry branches that swap navigation depending on the audience.

Navigation is placed at the side rather than across the top because it grows vertically. Admin operations grow per target, and a horizontal header raises the width at which it must collapse with every addition.

The side list is permanent only at `lg` and above; below that it collapses into the `AdminShellMenu` overlay. Tablets in portrait concentrate at `md` and above but below `lg`, and giving width to the side on that band would leave the body almost no more width than on mobile.

**`main` does not narrow its width.** Reading width and horizontal padding are the responsibility of [`ContentContainer`](../content-container/README.md).

This layout shell declares the admin theme (`data-surface`). The components under it only re-resolve tokens and need no changes.

It does not know the contents of `headerActions` and `navFooter`. A link back to the user-facing screens is one such content; the layout shell holds no destination.

The layout shell is not printed.

`AdminShell` stays a Server Component. The open state, the side list, the toggle control and the overlay are client islands that need hydration.

## Storybook and Tests

Storybook (`Layout/AdminShell`) covers the default composition, the side list collapsed, groups collapsed, a composition with elements at the bottom of the list, a composition with the hierarchy placed, tablet and mobile viewports, and the overlay opened in each. The tests cover that the body goes into `main`, the skip link's target, the destinations of the site name and the admin name, the navigation links and the bottom and header elements, not keeping the hierarchy section when its contents are empty, opening and closing, and that the navigation links do not disappear from the layout shell when collapsed.

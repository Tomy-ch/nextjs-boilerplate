# AppShell

## Purpose

Builds the outer frame of user-facing screens. It groups the header, navigation, the skip link, `main` and the footer, and places them in the same position on every screen.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AppShell` | Outer frame with header / nav / skip link / `main` / footer. |
| `AppShellMenu` | Side menu that collapses the header navigation on narrow screens. |
| `AppShellMenuFallback` | Non-pressable frame that occupies the same space at the same size until `AppShellMenu` arrives. |
| `AppShellNavLink` | Link that renders one navigation item. Inside the side menu it navigates without pushing history. |

`app-shell.definition.ts` holds the type of one navigation item (`AppShellNavItem`), the `id` of `main`, and the header height.

## Use Cases

Use it once, in the layout of the user-facing route group. Where the layout shell is mounted is decided by [0026](../../../../docs/adr/0026-layout-shell-mount.md).

In a layout shell with no navigation at all (both `navItems` and `navSlot` empty), the header's `nav` itself is not placed. A landmark with no contents remains in assistive technology's list as an item with no destination.

Navigation that cannot be decided without knowing the actor (items that change with login state, for example) is not mixed into `navItems` but passed to `navSlot` and `menuNavSlot` as dynamic holes. Mixing something that waits into `navItems` would make the layout shell itself wait, and every screen going through this layout shell would become dynamically rendered.

## Responsibility Boundaries

**`main` does not narrow its width.** Reading width and horizontal padding are the responsibility of [`ContentContainer`](../content-container/README.md).

The skip link is placed first so that keyboard and assistive-technology users can enter the body without going through the header navigation every time.

It does not know the contents of `sidebar` and `headerActions`. It only provides the place; the passing side decides what to show, when to show it, and how much width it takes.

The layout shell is not printed. The header, footer and skip link are for moving between screens; on paper they cannot be pressed and only take up space.

Admin screens have a separate layout shell ([`AdminShell`](../admin-shell/README.md)). The audience and the navigation differ, so merging them into one would make the layout shell carry branches.

`AppShell` is a Server Component. Only `AppShellMenu` is a client island that needs hydration for opening and closing.

## Storybook and Tests

Storybook (`Layout/AppShell`) covers the default composition, a composition with a region alongside, a narrow viewport, the side menu opened, a composition with no navigation, and a composition where the side menu's navigation comes only from the slot. The tests cover that the body goes into `main`, the skip link's target, the header navigation and the footer, that navigation can be opened from the side menu on narrow screens, that side menu navigation does not push history, and that the header's `nav` is not placed when there is no navigation.

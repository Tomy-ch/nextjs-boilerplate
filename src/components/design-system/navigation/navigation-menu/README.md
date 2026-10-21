# NavigationMenu

## Purpose

Lists the main destinations within the site structure and opens lower levels as needed.

## Role and Public Components

| Component / value | Role |
| --- | --- |
| `NavigationMenu` | The client-side root that manages opening / closing and focus movement. `viewport` chooses where opened content is shown. |
| `NavigationMenuList` | The list that lays out the destinations. |
| `NavigationMenuItem` | The item for one destination. |
| `NavigationMenuTrigger` | The trigger that opens a lower level. It does not navigate itself. |
| `NavigationMenuContent` | The lower level shown when opened. |
| `NavigationMenuLink` | A link to a destination. Composes `next/link` with `asChild`. |
| `NavigationMenuViewport` | The shared area that shows opened content together. The root renders it internally. |
| `NavigationMenuIndicator` | A decorative arrow pointing at the open item. It can be omitted. |
| `navigationMenuTriggerStyle` | Returns the classes for the same look as a trigger. Used for links that have no lower level. |

## Use Cases

Use it in a desktop header to provide site navigation with a hierarchy, such as categories.

## When Not to Use

**Do not use this component for simple navigation that opens no lower levels.** Laying out `nav` and `Link` is enough, and no client runtime is needed. Choose this component only once it is settled that a trigger must open lower items.

The hierarchy down to the current location is handled by [`Breadcrumb`](../breadcrumb/README.md), and paging through a list by [`Pagination`](../pagination/README.md). Gathering operations on a row is [`DropdownMenu`](../../overlay/dropdown-menu/README.md), whose target is operations rather than navigation.

## Responsibility Boundaries

It is a client island that needs hydration for opening / closing, hover delay and focus movement. It cannot be rendered directly from a Server Component.

It owns neither deciding the destinations, determining the current location, nor showing items by permission. To indicate the current location, pass `active` to `NavigationMenuLink`, which sets `aria-current="page"`.

The content of `NavigationMenuContent` is limited to destinations. To put in a form or reading material, use `Popover` or `Dialog`.

It has no display format for mobile. Whether to switch to a different path on a narrow viewport is decided by the screen that uses it.

The vendor is currently Radix, but the public API contains no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`.

## Storybook and Tests

Storybook checks the basic composition with items that have lower levels next to items that navigate directly, not using the shared viewport, and passing `active` to the item at the current location. The tests check the navigation landmark and list structure, that lower levels are not rendered until opened, opening / closing with the trigger and `aria-expanded`, with and without `viewport`, `aria-current` from `active`, that `navigationMenuTriggerStyle` gives the same look as a trigger, and the automated a11y check.

`NavigationMenuIndicator` is rendered by Radix after it measures the layout, so in jsdom it does not appear in the DOM. The tests check only that "adding it does not change the navigation semantics", and the look is checked in Storybook.

jsdom lacks `ResizeObserver`, which Radix uses, so the tests stub it. The automated a11y check excludes `region`. This is a constraint shared by UI that uses a Portal, and `region` is tagged `best-practice` in axe and is outside the repository's target level (WCAG 2.x AA).

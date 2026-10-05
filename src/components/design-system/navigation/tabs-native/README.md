# TabsNative

## Purpose

When showing the same subject from several views, switches the view by URL.

## Role and Public Components

| Component | Role |
| --- | --- |
| `TabsNative` | The `nav` representing the switch between views. `aria-label` states what it switches. |
| `TabsNativeList` | The `ul` that lays out the views. Conveys the item count to assistive technology. |
| `TabsNativeLink` | A link to a view. Specify `isActive` for the current view. |

There is no component equivalent to a panel. The displayed content is rendered by the destination page as is.

## Use Cases

- When the data fetched differs per view
- When panel content is large and you do not want what is not shown included in the initial render
- When the selected view should survive sharing, reload and the back action

## `TabsClient` vs This Component

Choose by **fetch cost and URL**, not by visual preference.

| | `TabsNative` | `TabsClient` |
| --- | --- | --- |
| Data fetched | Only the view being shown | Every view, every time |
| Initial payload | One view | All views |
| Panel rendering | server | server (through `children`) |
| Sharing, reload, back | Preserved | Lost |
| Feel of switching | route navigation | Immediate |

To merely switch between already fetched content without putting it in the URL, use `TabsClient`.

## Responsibility Boundaries

In the SSR-first selection it is `◎`. The URL holds the selected view, so no client runtime is needed and the initial render is settled on the server side.

**It does not use `role="tab"`.** The ARIA tab pattern assumes "switching panels on the client side"; applying it to links that navigate creates a mismatch where assistive technology is told something switched while the page actually changes. This is a set of links, and it conveys the current location with `nav` and `aria-current="page"`. This difference is the essential difference from `TabsClient`.

`href` is required, and the caller builds the destination URL. It has no responsibility for carrying over the current `searchParams`, so to switch while keeping filters and sort order, pass a URL that includes the existing query. The caller also determines which view is current and passes it as `isActive`.

The current view is indicated not only by text color but also by an underline. Relying on color difference alone makes it indistinguishable for some color vision characteristics and contrast settings.

Horizontal scrolling when the items do not fit is handled by the consumer's layout.

## Storybook and Tests

Storybook checks the default composition, selecting other than the first, switching while keeping an existing query, and so many items that they do not fit.

The tests check that it is exposed as a named `navigation`, that views are `link`s and the `tab` / `tablist` roles are not used, that they are listed as `listitem`s, that they have `href`, that only the current view gets `aria-current="page"`, that the current view is also indicated by an underline, and the automated a11y check.

# Breadcrumb

## Purpose

Shows the hierarchy down to the current location and lets the user go back to higher levels.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Breadcrumb` | A named `nav` landmark. Lets it be distinguished from other navigation. |
| `BreadcrumbList` | The `ol` that lists the levels. Indicates that the order is meaningful. |
| `BreadcrumbItem` | The `li` for one level. |
| `BreadcrumbLink` | A link back to a higher level. `next/link` can be composed with `asChild`. |
| `BreadcrumbPage` | The final item indicating the current location. Not made a link. |
| `BreadcrumbSeparator` | A decorative separator placed between items. The symbol can be replaced with `children`. |
| `BreadcrumbEllipsis` | An ellipsis indicating collapsed intermediate levels. |

## Use Cases

Use it where you want to show the current location within the site structure, such as lists and details that follow a category hierarchy, or admin settings screens.

Do not place it on a screen with only one level. On a screen whose route of arrival is not unique (such as a detail opened from several entry points), show the hierarchy in the site structure rather than the path actually followed.

## Responsibility Boundaries

It is an SSR-first display component that needs no client runtime. The caller determines the current route, builds the hierarchy and decides whether to collapse it.

`BreadcrumbEllipsis` only shows a symbol and does not open or close by itself. To let users reach the collapsed levels, the caller composes an interaction such as `DropdownMenu`.

For navigation within the repository, pass `Link` from `next/link` with `asChild`. The default `a` is for external links or when the destination is decided through props.

The vendor is currently Radix (`Slot`), but the public API contains no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`.

## Accessibility

The `nav` gets the name 「パンくずリスト」 ("breadcrumb list"). This lets it be distinguished in the list of landmarks when the same page has several navigations.

The current location offers no navigation to itself, so it is not a link; `aria-current="page"` alone conveys that it is the current page. The shadcn generated output adds `role="link"` and `aria-disabled`, but that gives an interactive role to an element that cannot receive focus and violates the a11y lint (`useFocusableInteractive` / `useSemanticElements`), so it is not adopted. In the ARIA APG breadcrumb pattern too, indicating the current location with `aria-current` is correct.

Separators are decorative, so they are excluded from screen reading. The hierarchy is conveyed by the `ol` structure, so the separators themselves carry no meaning. The ellipsis is likewise decorative, but keeps its text for screen reading.

## Storybook and Tests

Storybook checks the basic composition, composition with `next/link`, collapsing intermediate levels, replacing the separator symbol, and wrapping on a narrow viewport. The tests check that it is a named navigation landmark, the `ol` and item count, the destinations of higher levels, that the current location has no destination and conveys `aria-current`, that separators and the ellipsis are decorative, composition through `asChild`, and the automated a11y check.

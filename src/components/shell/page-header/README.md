# PageHeader

## Purpose

At the top of a page, shows what the page is and its primary actions.

## Role and Public Components

| Component | Role |
| --- | --- |
| `PageHeader` | Frame of the leading block. Places the title and description on the left and the actions on the right. |
| `PageHeaderTitle` | The page's name. Rendered as an `h1`. |
| `PageHeaderDescription` | One sentence supplementing the title. |
| `PageHeaderActions` | Region for the primary actions on the page as a whole. |

## Use Cases

Place it at the top of pages with a title and primary actions, such as lists, details and settings. Its home is directly under [`ContentContainer`](../content-container/README.md).

Both the description and the actions can be omitted. When omitted, only that row closes up; the rest of the layout does not change.

## Responsibility Boundaries

**It has no horizontal padding.** `ContentContainer` owns the padding, and adding it here too would misalign the vertical lines of the body and the leading block.

**Place it inside `main`.** A `header` element outside `main` / `article` / `aside` / `nav` / `section` becomes a `banner` landmark and claims to be the site-wide header. As long as `ContentContainer` is placed inside `main`, this condition is met naturally.

It does not own the body structure or data fetching. The caller decides the text to display.

The layout is a grid: the title and description stack in the left column and the actions go in the right column. To avoid adding wrapper elements around the children, each subcomponent owns its own position. On narrow screens they stack vertically in DOM order.

Place only one `PageHeaderTitle` per page. It is the root of the heading hierarchy, so do not use it for decoration.

Put in `PageHeaderActions` only actions on the page as a whole. Actions on a specific row or item go near that target. On narrow screens they wrap and take up vertical space, so keep their number down and group secondary ones into a `DropdownMenu`.

It can be used as a Server Component. Even when a client island is placed in `PageHeaderActions`, only that component holds the boundary.

## Storybook and Tests

Storybook covers the default composition combined with `ContentContainer`, the case without a description, the case without actions, and centering on a viewport wider than the reading width. The tests cover that the `h1` is the root of the heading hierarchy, that the leading block is a `header` element, that it holds together with the description and actions omitted, that it has no horizontal padding, accepting `className`, and the automated a11y check.

Landmark verification is not included in the tests. The role computation of jsdom and testing-library treats `header` as `banner` unconditionally and does not reproduce HTML's landmark scoping rule (not a landmark inside `main`). Verification in a real browser is done in Storybook.

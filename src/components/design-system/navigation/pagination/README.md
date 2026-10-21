# Pagination

## Purpose

Represents page movement for a list that navigates by URL.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Pagination` | The `nav` representing the whole pagination. It also provides the accessible region name. |
| `PaginationContent` | The list that lays out pagination items horizontally. Wraps when they do not fit. |
| `PaginationItem` | An individual list item wrapping a page number, previous / next, or an ellipsis. |
| `PaginationLink` | A link to any page. `isActive` indicates the current page. |
| `PaginationPrevious` | A link with a label and icon to the previous page. |
| `PaginationNext` | A link with a label and icon to the next page. |
| `PaginationEllipsis` | A non-navigating display element indicating that a run of page numbers is omitted. |

## Use Cases

Shows links to the previous / next, current and omitted pages in a page-based list.

## Responsibility Boundaries

It holds no fetch, current page calculation or URL building. The feature passes the href and the current page.

Links are rendered with `next/link`. Because they are in-app route navigations, the destination is prefetched once it enters the viewport, and navigation is a client-side transition. When prefetch should be suppressed, such as when many page numbers are listed, the caller passes `prefetch={false}`.

The caller decides how many are shown. **When they do not fit, they wrap** — how many fit depends on the container width and cannot be known from the component. Stretching horizontally without wrapping would let the overflow spill sideways with the whole page, making other content unreadable without horizontal scrolling.

`href` is required. Passing a query-only relative URL such as `?page=2` resolves both prefetch and navigation against the current URL, replacing only the query while keeping the current pathname. To move while keeping filters and sort order, the caller builds a URL that includes the existing query.

The `href` of `PaginationPrevious` / `PaginationNext` can be omitted. At an **end with nowhere to go**, such as the first or last page, omit it and it is rendered as a non-operable control instead of a link. The element is not removed entirely because, with only one side left, the remaining control would move left or right and invite mis-operation. The position is kept, and assistive technology is told that "it exists but cannot be used now".

The displayed content can be replaced with `children` and the accessible name with `aria-label`. Cursor-based previous / next uses this mechanism as is, so [`CursorPagination`](../../../app-starter/cursor-pagination/README.md) has no previous / next of its own.

## Storybook and Tests

Storybook checks the basic form with page numbers, previous / next from a middle page, the **first page** (previous is a non-operable control), the **last page** (next is a non-operable control), and a row combining the ellipsis and previous / next when there are many pages.

# CursorPagination

## Purpose

Moves to the previous / next page in a cursor-based list.

## Role and Public Components

| Component | Role |
| --- | --- |
| `CursorPagination` | A `nav` that lays out the previous / next moves. It receives the destination URLs as `previousHref` / `nextHref`. |

## Use Cases

- Moving one page back or forward in a list from an API that does not return a total count
- A list that puts `nextCursor` in the query to fetch the next part

For a list that moves to any position by page number, use `Pagination`.

## Pagination vs This Component

| | `CursorPagination` | `Pagination` |
| --- | --- | --- |
| Premise | Cursor-based (no total count or total pages) | Page-based |
| What it lays out | Only previous / next moves | Page numbers and previous / next |
| Can it jump to any position | **No** | Yes |

Although both are "pagination", the contracts differ, so neither is used in place of the other.

## Responsibility Boundaries

An SSR-first component. It works with URL navigation through `next/link` alone, so it has no `"use client"`, React state or browser API.

**Building the URL is owned by the caller.** Putting the `nextCursor` returned by the API into the query and carrying over the current filters and sort order are the caller's responsibility; this component only moves to the `href` it receives. It neither fetches nor refetches.

**It has no previous / next mechanism of its own.** It composes `Pagination`'s `PaginationPrevious` / `PaginationNext` as they are, and the behavior of rendering an end with no destination as a non-operable control rather than a link actually lives on the [`Pagination`](../../design-system/navigation/pagination/README.md) side. What this component takes on is the cursor-based contract of "not laying out page numbers".

**For a direction with no destination, omit the `href`.** The position is kept, and assistive technology is told "it exists but cannot be used now".

Several navigations sit on the same screen, so `aria-label` states what the movement is for. When omitted it is 「ページ送り」 ("pagination"). The action copy can be replaced with `previousLabel` / `nextLabel`, and the accessible names change with it.

## Storybook and Tests

Storybook checks the state where both directions are available, the first page, the last page, the case that fits on one page, replaced copy, and distinguishing with `aria-label`.

Tests check that it is exposed as a named `navigation`, that it lays out only previous / next without page numbers, that a direction with a destination becomes a link with an `href`, that one without becomes a non-operable control, that the element remains even without a destination, replacing the copy and `aria-label`, and automated a11y checks.

# SearchFieldNative

## Purpose

Places the keyword search field of a list screen as a GET form that needs no JavaScript. The search term goes into the URL, so the results stay consistent with sharing, history and the back action as they are.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SearchFieldNative` | As a landmark of the `search` element, groups the search input and the submit button into a GET form. Restores the query to carry over as hidden inputs. |

The main props are as follows.

| props | Role |
| --- | --- |
| `label` (required) | The accessible name of the search input. It has no visual label, so this alone tells what the field searches. |
| `action` | The submission target. Uses the native `form` attribute as is. |
| `name` | The name of the query that carries the search term. The default is `q`. |
| `defaultValue` | The search term shown initially. Passed to reflect the current search condition. |
| `hiddenParams` | The query carried over on submission. Restored as hidden inputs. |
| `submitLabel` | The submit button's text. The default is 「検索」 ("search"). |

## Use Cases

- A search field at the top of a list screen for filtering by keyword
- Search on an admin screen that must be reachable even with JavaScript disabled
- Search that needs no per-keystroke updates, where seeing the results after submitting is enough

To change the results as the user types, use `SearchFieldClient`. For UI whose goal is choosing from a set of candidates, use `Command`. A search field and candidate selection are different things.

On screens that also list conditions other than the keyword (state, period, price range and so on), place this search field inside [`FilterBar`](../../../patterns/filter-bar/README.md). `FilterBar` has no search field; it is the outer frame that bundles the applied conditions, the count and the clear-all action, so the relationship is nesting rather than exclusion. This component alone suffices when the only filter is the keyword.

## Responsibility Boundaries

In the SSR-first selection it is `◎`. It is a Server Component that needs no hydration and has no client island.

It owns no running of the search, fetching of results or building of URLs. The caller passes the submission target as `action` and the query to carry over as `hiddenParams`. This division is the same as `Pagination`; `components` does not interpret URLs.

Its look comes from composing `InputGroup`, and this component has no classes of its own. The owner of the look of an input with a search icon is `InputGroup`.

### The caller chooses which query to carry over

A GET form discards the whole URL query on submission. Pass to `hiddenParams` what should survive a new search, such as sort order or display format. Conversely, a query that loses its meaning on a new search, such as the page number, is **reset by not passing it**. This selection is part of the screen's specification and cannot be decided on the component side.

### The `search` Element and Landmark

It can be reached from assistive technology's list of landmarks. When placing several search fields on one screen, distinguish the landmarks with `aria-label`.

The landmark is expressed with the HTML `search` element rather than a `role="search"` attribute. Browsers map the `search` element to the `search` role, but `aria-query` 5.3.0, used in the tests, does not register this element yet, so it cannot be found with `getByRole("search")`. This is a gap in the tool, and the implementation is not reverted to `div role="search"` to work around it. The tests get the element by `data-slot` and verify directly that it is a `search` element.

## Storybook and Tests

Storybook checks the default search field, adding helper text, reflecting the current search condition, a query to carry over, changing the submit button's text, and changing the query name.

The tests check that a GET form sits in the landmark of a `search` element, `type="search"` and the default query name, specifying the query name and initial value, that `hiddenParams` are included in the submitted values, that only the search term is submitted when nothing is carried over, that the submit button is `type="submit"`, and the automated a11y check.

# SearchFieldClient

## Purpose

A search field that holds keyword search input. **The caller chooses when input counts as committed** — when typing stops (the default), or only on a submit action. The former creates a flow where results change without pressing a submit button; the latter a flow where it is committed together with the other conditions.

## Role and Public Components

| Component / value | Role |
| --- | --- |
| `SearchFieldClient` | As a landmark of the `search` element, groups the search input and the clear button (and the submit button). Calls `onSearch` on commit. |
| `SEARCH_FIELD_COMMIT` | What counts as a commit (`typing` / `submit`). `search-field-client.definition.ts` is the owner. |
| `SEARCH_FIELD_DEBOUNCE_MS` | The default wait (milliseconds) between input stopping and the notification. |

The main props are as follows.

| props | Role |
| --- | --- |
| `label` (required) | The accessible name of the search input. It has no visual label, so this alone tells what the field searches. |
| `onSearch` (required) | Receives the current search term on commit. An empty string when cleared. |
| `commit` | What counts as a commit. The default is `typing` (when typing stops). |
| `value` / `onValueChange` | Passed when using it as a controlled component. Used on screens that keep the search term in the same place as the other conditions. |
| `defaultValue` | The search term shown initially. Passed when uncontrolled. |
| `debounceMs` | The wait before notification. The default is `SEARCH_FIELD_DEBOUNCE_MS`. Effective only when `commit` is `typing`. |
| `clearLabel` | The accessible name of the clear button. The default is 「検索語を消去」 ("clear search term"). |
| `submitLabel` / `submitDisabled` | The submit button's text and whether it can be pressed. Effective only when `commit` is `submit`. |

## Use Cases

- The main flow of a list, filtering results while typing (`commit` left at its default)
- Fetching is heavy and per-keystroke calls should be batched with a wait
- The search term sits alongside other conditions and is committed together with them (choose `submit` for `commit`)
- A consumer without a server (such as [`docs-viewer`](../../../../../docs-viewer/README.md), delivered as a static site) keeps the search term in client state and filters the results on the spot. There is no server to re-read `searchParams`, so "Render the results in a Server Component" below does not apply in this case

When a form that can submit without JavaScript is needed, or search is not the main flow, use `SearchFieldNative`. For UI whose goal is choosing from a set of candidates, use `Command`.

On screens that also list conditions other than the keyword (state, period, numeric range and so on), place this search field inside [`FilterBar`](../../../patterns/filter-bar/README.md). `FilterBar` has no search field; it is the outer frame that bundles the applied conditions, the count and the clear-all action, so the relationship is nesting rather than exclusion. This component alone suffices when the only filter is the keyword.

## Responsibility Boundaries

It is a client island that needs hydration to hold the input and control the wait. It cannot be rendered directly from a Server Component.

It owns no running of the search, fetching of results or building of URLs. On commit it only calls `onSearch`, and it does not operate the router either. This division is the same as `Pagination`; `components` does not interpret URLs.

Its look comes from composing `InputGroup`, and this component has no classes of its own. The owner of the look of an input with a search icon is `InputGroup`.

### Render the results in a Server Component

The caller puts the search term received in `onSearch` into `searchParams`, and the results are rendered in a Server Component. Fetching the results on the client as well would make the URL and the display disagree, breaking sharing, history and the back action. This component is a client only for the usability of the input, not to move data fetching and rendering to the client. The one exception is a consumer without a server, which keeps the search term in client state (Use Cases).

### Pass a stable function to `onSearch`

When `commit` is `typing`, the wait is restarted every time the `onSearch` reference changes. Passing a new function on every render means the notification never fires. The caller stabilizes the reference with `useCallback` or similar.

### The screen decides whether an empty submit can be pressed

`submitDisabled` is not decided by the component based on "is it empty". Whether an empty submit is meaningful (= removing the search term currently in effect) can be judged only by the caller, which knows what is in effect now.

The initial render alone does not notify. `defaultValue` exists to reflect the current search condition, and there is no need to search again on mount.

### The `search` Element and Landmark

It can be reached from assistive technology's list of landmarks. When placing several search fields on one screen, distinguish the landmarks with `aria-label`.

When `commit` is `typing`, Enter does not commit. Choosing `submit` commits on both Enter and the submit button, but in neither case does it have a form. With a form, an action before hydration finishes would run the browser's default submission and navigate to the current URL without the conditions currently in effect.

The landmark is expressed with the HTML `search` element rather than a `role="search"` attribute. Browsers map the `search` element to the `search` role, but `aria-query` 5.3.0, used in the tests, does not register this element yet, so it cannot be found with `getByRole("search")`. This is a gap in the tool, and the implementation is not reverted to `div role="search"` to work around it. The tests get the element by `data-slot` and verify directly that it is a `search` element.

The clear button is rendered only when there is a search term; pressing it empties the input and returns focus to the input. Clearing is a change to the input, and commit follows `commit` — with `typing`, an empty string is notified after the wait; with `submit`, it is notified only on a submit action.

## Storybook and Tests

Storybook checks the default notification, adding helper text, the state where the current search condition is reflected and the clear button appears, a longer wait, committing only on a submit action, and that submit made unpressable. The notified search term and the filtered results are placed on the same screen so the feel of the wait can be checked with real interaction.

The tests check that a `type="search"` input sits in the landmark of a `search` element, that the initial render does not notify, that it notifies after input stops, that while input continues notifications are batched and only the last value is notified, that the wait can be changed, the showing and text of the clear button, that clearing empties the input, returns focus and notifies an empty string, and the automated a11y check. Fake timers are used to verify the wait; only the automated a11y check switches back to real timers because the checker needs real time.

When `commit` is `submit`, they check that typing does not notify, that clearing does not notify, that a submit action notifies, that the submit button's text can be replaced, that it becomes unpressable when the caller decides so, and that `typing` shows no submit button. When used as a controlled component, they check that it reflects the search term passed in from outside, that it passes the value to the caller on every keystroke and clear, and that it holds nothing itself.

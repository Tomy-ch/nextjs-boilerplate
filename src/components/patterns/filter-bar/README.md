# FilterBar

## Purpose

Shows a list's filtering controls together with the conditions currently in effect.

## Role and Public Components

| Component | Role |
| --- | --- |
| `FilterBar` | Wraps the whole filter area as a `section` landmark. |
| `FilterBarControls` | Row that lays out the search field and the control that opens the conditions. |
| `FilterBarTrigger` | Control that opens the condition inputs. It shows the number of conditions in effect. |
| `FilterBarActiveFilters` | List of the conditions in effect. |
| `FilterChip` | One condition and the control that removes it. |
| `FilterBarSummary` | The number of filtered results and the path to clear all conditions. |

## Use Cases

It has no search field of its own, so compose [`search-field-native`](../../design-system/form/search-field-native/README.md) or [`search-field-client`](../../design-system/form/search-field-client/README.md) into `FilterBarControls`. The contents of the condition inputs differ per screen, so the caller assembles a `Sheet` or `Popover` and passes `FilterBarTrigger` as its trigger.

## Not used on a screen with a single condition

This set assumes **there are several conditions**. That is why it lists the conditions in effect as chips and has a path
to clear them all at once; on a screen with only one condition, the input itself already shows the condition in effect,
and a chip would only be a copy of it. Clearing it is also just resetting that condition to its default.

With a single condition, the same is achieved by placing the input in a plain `form` and making it a landmark with an
`aria-label`. **At widths where the input sits in an overlay and is hidden while closed, put the condition in effect itself
in the text of the opening control** — a count marker alone conveys only "something is filtering", and the user has to open it
to see what.

## `SearchField*` vs This Component

They are not exclusive but nested. `SearchFieldNative` / `SearchFieldClient` handle **the input for a single search term**, and `FilterBar` handles **the frame for the whole filter, including the search term**. It has no search field of its own, so the field is composed into `FilterBarControls`.

| Screen | What to use |
| --- | --- |
| Filtering by keyword only | `SearchField*` only |
| Conditions such as status or period in addition to the keyword | `FilterBar` + `SearchField*` |
| Conditions but no keyword search | `FilterBar` only |

Which one to compose is decided by the search field's own criteria (whether a form that submits without JavaScript is needed, whether it follows keystrokes). `FilterBar` combines with either.

The removal means of `FilterChip` matches the composed search field. With `SearchFieldNative` the conditions are in the URL, so use `removeHref`; with `SearchFieldClient`, holding the conditions on the client side, use `onRemove`.

## Removal Means

Pass `FilterChip` exactly one of `removeHref` or `onRemove`.

- `removeHref`: for lists that put conditions in the URL. The state with the condition removed stays in history and can be shared as a URL.
- `onRemove`: for lists that hold conditions on the client side.

If neither is passed, the condition is display-only.

## How It Reaches Assistive Technology

`FilterBar` is a `section` landmark, so users can move directly to the filter. When the same screen has several filters, distinguish them with `label`.

`FilterBarActiveFilters` keeps its element even with no conditions. If the whole list disappeared when the last condition was removed, what happened would not be conveyed.

The count is conveyed with `aria-live="polite"`. If the result of changing conditions appeared only in the look of the list, a user not looking at the screen would not know how many results there are.

The name of a removal control includes the condition name and value. "×" alone cannot tell which one is removed from the list of controls when several are lined up.

Removing a condition with `onRemove` makes the pressed removal control itself disappear. So that focus does not fall to the document, focus moves to the condition list right before removal.

## Responsibility Boundaries

It does not own interpreting conditions, building URLs, running the filter, or computing counts. The caller passes the conditions to display, the removal targets, and the count. The feature owns the URL state.

## Storybook and Tests

Storybook covers putting conditions in the URL, no conditions, placing the inputs in an overlay, and holding conditions on the client side. The tests cover the names of the landmark and the list, the display of the condition count, the count and the live region, the three removal variants, the name of the removal control, where focus goes after removal, and the automated a11y check.

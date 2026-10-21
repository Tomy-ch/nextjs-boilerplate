# ToggleGroupClient

## Purpose

Lays out related toggles as one set and reflects the selection immediately as browser-side state.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ToggleGroupClient` | The client-side root that holds the selection. `type` chooses exclusive / multiple. |
| `ToggleGroupClientItem` | One item in the set. Identified by `value`. |

## Use Cases

- A display switch for the moment only, put neither in the URL nor in a form
- Reflecting the selected result immediately in another display

When the selection is sent as a form value or put in the URL, use `ToggleGroupNative`.

## ToggleGroupNative vs This Component

| | `ToggleGroupClient` | `ToggleGroupNative` |
| --- | --- | --- |
| Actual element | button (Radix) | native radio / checkbox |
| Form value | None | **Submitted as is** |
| hydration | Needed | Not needed |
| Moving between items | roving tabindex (Radix) | browser standard (arrow keys for radio) |

## Responsibility Boundaries

In the SSR-first selection it is the exception to `○`. The default is `ToggleGroupNative`; choose this one when an immediate switch that goes neither into the URL nor into a form is needed. It needs hydration and cannot be rendered directly from a Server Component.

Passing `value` makes it a controlled component and `defaultValue` an uncontrolled one. It holds no saving of the selection, reflection in the URL or submission.

The set itself has no name, so **always state what it toggles** with `aria-label` or `aria-labelledby`. Radix takes care of moving between items with the arrow keys and of roving tabindex.

### `type` changes the semantics themselves

| `type` | Role of the set | Role of the item | How selection shows |
| --- | --- | --- | --- |
| `single` | `radiogroup` | `radio` | `aria-checked` |
| `multiple` | `toolbar` | `button` | `aria-pressed` |

In `single`, items **do not have** `aria-pressed`. The selected look can be shown in both modes because `toggleVariants` also looks at `data-state="on"`, which both share. When the caller adds styling that depends on the item's state, it also uses `data-state` rather than `aria-pressed`.

`variant` and `size` specified on the set are inherited by its items. Setting `spacing` to `0` makes items adjacent, giving the look of a segmented control with only the two ends rounded. A larger value turns it into a row of independent buttons.

The vendor is currently Radix, but the public API contains no vendor name.

## Storybook and Tests

Storybook checks exclusive selection, multiple selection (with the selected values shown alongside), the `outline` variant, `spacing` opened up, three sizes, and including unselectable items.

The tests check that `single` becomes `radiogroup` / `radio` and `multiple` becomes `toolbar` / `aria-pressed`, that the selected item has `data-state="on"` and the surface styling applies there, exclusive toggling, array notification in multiple selection, that it has no value sent to a form, inheritance of `variant` / `size`, the `spacing` CSS variable, disabled, and the automated a11y check.

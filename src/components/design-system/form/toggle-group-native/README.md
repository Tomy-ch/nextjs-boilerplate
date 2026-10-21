# ToggleGroupNative

## Purpose

Lays out related toggles as one set and submits the chosen value as a form. Use it for a group of toggles whose choices sit side by side, such as display currency or ranking period.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ToggleGroupNative` | The `fieldset` representing the set. `aria-label` states what it toggles. |
| `ToggleGroupNativeItem` | One item in the set. The actual element is a visually hidden native input and the `label` that reflects it. |

## Use Cases

- An exclusive selection sent as a form, such as display currency or ranking period
- A multiple selection sent as a form, such as which columns to show

For an immediate display switch that goes neither into the URL nor into a form, use `ToggleGroupClient`.

## ToggleGroupClient vs This Component

| | `ToggleGroupNative` | `ToggleGroupClient` |
| --- | --- | --- |
| Actual element | native radio / checkbox | button (Radix) |
| Form value | **Submitted as is** | None |
| hydration | Not needed | Needed |
| Moving between items | browser standard (arrow keys for radio) | roving tabindex (Radix) |

## Responsibility Boundaries

In the SSR-first selection it is `○`. The items are native radio / checkbox, so the selection is submitted as a form value as is, and the initial render is also settled on the server side. It needs no client runtime.

For exclusive selection make the items `type="radio"`, for multiple selection `type="checkbox"`, and give them the same `name` within the set. Moving between choices follows the browser's standard behavior.

It is exposed as a `fieldset`, so **always state what it toggles** with `aria-label` or `aria-labelledby`. When a `legend` is placed, that becomes the name.

It owns no handling after submission, building of URLs or persistence of the selection.

### Handling the hidden input

Each item makes the `label` the visible element and hides the input inside it only visually with `sr-only`. `display: none` and `aria-hidden` are not used because they make it unreachable from both assistive technology and the keyboard. The input receives focus, and the `label` follows its look with `has-[:checked]` / `has-[:focus-visible]`.

The selected surface and sizes share `toggleVariants`, so they match `Toggle`. Adjacent items overlap their borders, and rounded corners go only on the two ends, so it looks like one continuous segmented control.

It has the same semantics as `RadioGroupNative` and differs only in look. Use `RadioGroupNative` for a vertical list with dots, and this one for pressable surfaces side by side.

## Storybook and Tests

Storybook checks exclusive selection, multiple selection, the `outline` variant, three sizes, a case that includes unselectable items, and placement in a native form.

The tests check that it is exposed as a named `group`, that exclusive selection becomes radio and multiple selection checkbox, that it has `name` / `value` as native attributes, exclusive toggling and simultaneous multiple selection, that the hidden input is reachable from assistive technology and the keyboard, disabled, that the selected surface and sizes are the same tokens as `Toggle`, and the automated a11y check.

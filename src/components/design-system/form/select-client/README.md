# SelectClient

## Purpose

Provides a custom popup and keyboard / focus interaction that a native select cannot meet.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SelectClient` | The client-side root that manages the selected value and open state with Radix. |
| `SelectTrigger` | The interactive element that shows the current value and opens the options popup. |
| `SelectValue` | Shows the selected value, or the placeholder, inside the trigger. |
| `SelectContent` | The options popup shown in a Portal and its scroll area. The default `popper` matches the trigger width; choose `item-aligned` only when needed. |
| `SelectGroup` | A group gathering related options. |
| `SelectLabel` | The heading of an option group. |
| `SelectItem` | One option. Also shows the selected mark. |
| `SelectSeparator` | A decorative line separating groups of options. |
| `SelectScrollUpButton` | The interactive element that moves a scrollable option list upward. |
| `SelectScrollDownButton` | The interactive element that moves a scrollable option list downward. |

## Use Cases

Use it only where a scrolling option list or a custom popup is actually needed.

## Responsibility Boundaries

It is not the default for the initial render. Prefer `SelectNative` for a few static options; the feature manages state, search and business data.

## Storybook and Tests

Storybook checks the client island including a visible label, disabled and invalid; the tests check the initial value, disabled and a11y.

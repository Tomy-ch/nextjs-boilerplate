# SwitchNative

## Purpose

Toggles a setting on / off as a native form value.

## Role and Public Components

| Component / type | Role |
| --- | --- |
| `SwitchNative` | An SSR-first component that renders `input type="checkbox"` with the look of a switch. It is still read out as a checkbox. |
| `SWITCH_SIZE` | The display size constant. This directory is its owner, and `SwitchClient` refers to the same values. |

## Use Cases

Use it where a setting is saved as a form, such as receiving notifications or public / private.

## SwitchClient vs This Component

| | When to use |
| --- | --- |
| `SwitchNative` | Form submission and the initial render are enough. Works without browser JavaScript |
| `SwitchClient` | Reflects the toggled result on screen immediately, updates optimistically and reverts on failure, keeps several switches in sync |

The default is `SwitchNative`. Switch to `SwitchClient` only once a requirement matching the right-hand column above is settled.

## Toggle vs This Component

They may look alike, but their responsibilities differ. The dividing line is "**does it change a setting, or the current way things look**".

| | `Switch` | `Toggle` |
| --- | --- | --- |
| Semantics | `checkbox` / `switch` | `button` + `aria-pressed` |
| What it represents | A setting's on / off (receive notifications, publish) | The applied display state (things currently look this way) |
| Submitted value | **Has one** (becomes a form value) | None (an action button) |
| Effect | Saved and persisted | Changes how that screen looks |
| Examples | Receiving notifications, public / private | Display density, whether to wrap |

If it is saved and still there the next time it is opened, use `Switch`; if it only affects how things look right now, use [`Toggle`](../../action/toggle/README.md). For a group of toggles with exclusive or multiple selection, use `ToggleGroup`.

## The semantics are checkbox

The actual element is `input type="checkbox"`, and it is not given `role="switch"`.

The `switch` role requires `aria-checked`, but with an uncontrolled native input React does not re-render on user interaction, so it cannot be kept in sync. An `aria-checked` that disagrees with the real state is more harmful than being read out as a checkbox. Biome's `useAriaPropsForRole` also detects this gap.

When it must reach assistive technology as "on / off", use [`SwitchClient`](../switch-client/README.md), where Radix keeps state and role in step. What this component provides is **the look of a switch and a native form value**; it is read out as a checkbox.

The difference from `CheckboxNative` is likewise only the look. Use `CheckboxNative` for multiple selection or consent confirmation in a form, and this one where you want to show "on / off" visually, such as enabling a setting.

## Responsibility Boundaries

It has no label. The caller associates what the setting is with `Label` or similar. It owns neither the timing of saving, reflecting the toggled result, nor handling of failure.

The visual track and thumb are built with CSS alone, and `:checked` holds the state. The native `size` attribute represents the character count of a text input and means nothing for a switch, so it is replaced by display size props.

## Storybook and Tests

Storybook checks the basic state, initially on, disabled, display sizes, and submission as part of a native form. The tests check that it is read out as a checkbox, that it emits no `role` or `aria-checked`, that it has the form `name` / `value`, toggling by click, disabled, the `size` data attribute, and the automated a11y check.

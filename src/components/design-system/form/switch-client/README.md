# SwitchClient

## Purpose

Toggles a setting on / off and reflects the result on screen immediately.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SwitchClient` | A client island switch that handles toggling as React state. |

The display size constant `SWITCH_SIZE` is owned by [`switch-native`](../switch-native/README.md). If native and client did not look the same, they would look like different components when both appear on one screen, so the values are shared.

## Use Cases

Use it for settings whose toggled result is reflected on the spot, for operations that update optimistically and revert on failure, and for keeping several switches in sync with each other.

## SwitchNative vs This Component

Whether hydration is needed is the dividing line. If form submission and the initial render are enough, use the SSR-first [`SwitchNative`](../switch-native/README.md). Choose this component only once a requirement that needs browser state is settled.

The other difference is screen reading. In this component Radix sets `role="switch"` and `aria-checked` in step with the state, so assistive technology hears it as "on / off". `SwitchNative` is an uncontrolled native input, so it cannot keep `aria-checked` in sync and is read out as a checkbox. If conveying it to assistive technology as a switch is a requirement, choose this component.

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

## Responsibility Boundaries

It does not own how the toggled result is saved or how it reverts on failure. The caller handles them through `checked` / `onCheckedChange`. It has no label either, so associate what the setting is with `Label` or similar.

It cannot be rendered directly from a Server Component. Radix sets `role="switch"`.

The vendor is currently Radix, but the public API contains no vendor name.

## Storybook and Tests

Storybook checks immediate reflection of the toggled result, disabled, display sizes and keeping several switches in sync. The tests check that it is read out as a `switch`, that interaction is handled as state and the result reflected, disabled, that the `size` data attribute has the same default as `SwitchNative`, and the automated a11y check.

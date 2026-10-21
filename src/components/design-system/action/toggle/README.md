# Toggle

## Purpose

Shows "whether that display is applied now" as a pressed state and lets it be switched. Used for actions that change how the screen looks, such as display density or turning wrapping on and off.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Toggle` | A toggle button with `aria-pressed`. It receives the pressed state as `pressed` and does not hold it itself. |
| `toggleVariants` | A helper that builds the look's variants. Reused by `ToggleGroup` and others that need the same look. |

## Use Cases

- Actions that switch how the screen looks, such as a list's display density or whether text wraps
- A standalone button that should show whether it is applied with the fill of its surface

## Switch vs This Component

They may look alike, but their responsibilities differ. The dividing line is "**does it change a setting, or change how things look now**".

| | `Toggle` | `Switch` |
| --- | --- | --- |
| Semantics | `button` + `aria-pressed` | `checkbox` / `switch` |
| What it represents | Whether a display is applied (things look this way now) | A setting on / off (receive notifications, make public) |
| Submitted value | None (an action button) | **Yes** (becomes a form value) |
| Effect | Changes how that screen is shown | Saved and persists |
| Examples | Display density, whether text wraps | Receiving notifications, public / private |

If it is saved and still there the next time it is opened, use [`SwitchNative`](../../form/switch-native/README.md) / [`SwitchClient`](../../form/switch-client/README.md); if it is only how things look right there, use this. To submit multiple choices or consent as form values, use `CheckboxNative`.

## Responsibility Boundaries

In the SSR-first selection it falls under `◎`. It only receives the pressed state as `pressed` and holds no state, so it does not need `"use client"`. As a result, **it can be used the same way from both Server Components and Client Components**.

- When switching through the URL or a form … the server side decides `pressed` and passes it
- When switching through temporary browser-side state … the caller's client island passes the value from `useState`

**There is no client-island version.** The shadcn output uses Radix's `Toggle`, but all it adds is uncontrolled state (`defaultPressed`) and the `data-state` attribute; the reaction to a press itself is handled by the native `button`. If the caller holds the state, the same thing can be done, so this one component covers both uses. Unlike the client versions of `Tabs` or `Slider`, there is no feature native cannot provide.

The default `type` is `"button"`. To switch through the URL, the caller either gives `type="submit"` and `name` / `value` to include it in a native form, or replaces it with a `Link`. It does not own deciding the value after switching, building the URL, or submission.

When placing an icon only, give it an accessible name with `aria-label`. The pressed state is conveyed by `aria-pressed`, so **do not switch the name by state, such as 「〜を有効にする」 / 「〜を無効にする」 ("enable …" / "disable …")**. Keep the name and change only the state.

The focus indicator follows the `outline` idiom (`focus-visible:outline-2` / `outline-offset-2` / `outline-active`). The pressed and hover surfaces both use `accent`. The generated output applies `muted` and `muted-foreground` on hover, but it is aligned to the same `accent` as pressed.

## Storybook and Tests

Storybook checks unpressed, pressed, the `outline` variant and its pressed state, the 3 sizes (the default variant has neither border nor fill, so no difference is visible when unpressed; they are shown in two rows, `outline` and pressed), icon only, the non-operable state, switching through browser-side state, and including it in a native form.

Tests check that the pressed state is exposed through `aria-pressed`, that the accessible name does not change when the state changes, that the caller's state is reflected, that the default is `type="button"`, that `type` / `name` / `value` can be overridden to include it in a native form, disabled, `variant` and `size`, naming for icon only, and automated a11y checks.

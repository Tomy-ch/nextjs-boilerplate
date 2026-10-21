# Direction

## Purpose

Conveys the text direction to the components beneath it. Components that change which way they open or what the arrow keys mean according to direction read it from this Provider.

## Role and Public Components

| Component / Function | Role |
| --- | --- |
| `DirectionProvider` | A client-side Provider that distributes the text direction to what is beneath it. Defaults to `ltr` when omitted. |
| `useDirection` | Reads the direction distributed by the nearest `DirectionProvider`. Returns `ltr` when there is no Provider. |

`DIRECTION` and `DirectionValue` are exported from `direction.definition.ts`. This definition owns the values that can be given to `dir`, and callers do not write strings such as `"rtl"` directly.

`dir` has an alias, `direction`. The generated output accepted both, so both are kept as is; when both are specified, `direction` wins.

## Use Cases

- Running components whose placement or arrow-key meaning changes with direction (`SelectClient`, `DropdownMenu`, `SliderClient` and so on) under an explicit direction
- Writing your own component whose behavior changes with direction and reading the current direction with `useDirection`

## Responsibility Boundaries

It distributes a React context, so it is a client island that needs hydration. It cannot be rendered directly from a Server Component. When the content itself needs no client runtime, pass elements built in a Server Component as `children`.

**This repository fixes the default to `ltr` and has no feature for users to switch direction.** This is because no decision has been made to provide an RTL locale. `rtl` is a value for showing how what is beneath changes when the Provider is replaced; if a UI to switch direction from the screen is needed, the locale decision comes first.

`dir` is not a DOM attribute. This Provider only distributes a context and does not change CSS behavior such as text wrapping or `text-align`. When those need to change, the caller also sets the `dir` attribute on the `html` element.

Switching display copy is not this component's responsibility. Direction and language are separate concerns, and copy is handled on the feature side.

The vendor is currently Radix.

## Storybook and Tests

Storybook checks the default when omitted, `ltr` specified explicitly, and `rtl` passed. As an example whose placement and arrow-key meaning change with direction, it composes `DropdownMenu`, so the difference when the Provider is replaced can be seen in actual rendering.

Tests check that `ltr` is distributed when omitted, that the direction is conveyed through both `dir` and the alias `direction`, that `direction` wins when both are present, that the inner one wins when nested, that the DOM `dir` attribute is not set, that `useDirection` returns `ltr` when there is no Provider, and automated a11y checks.

jsdom lacks the `ResizeObserver` and `scrollIntoView` that Radix uses for positioning, so they are stubbed on the test side.

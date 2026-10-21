# SliderNative

## Purpose

Specifies a number through continuous interaction. Use it for input where choosing a rough position within a range is more natural than typing the value itself.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SliderNative` | A form component that gives the native `input type="range"` its default look. Takes `value` / `min` / `max` / `step` as native attributes. |

## Use Cases

- Roughly choosing a single number, such as a maximum price or the number of items shown
- Submitting the chosen value as is with a native form

Range input that specifies the lower and upper bound at once lacks a thumb here, so use `SliderClient`.

## Responsibility Boundaries

In the SSR-first selection it is `◎`. The native `input type="range"` meets the needed semantics and interaction, so it has no `"use client"`, React state or browser APIs. Holding the value, reflecting it in `searchParams`, and handling after submission belong to the caller.

`input type="range"` is exposed to screen readers as a `slider`, and the value is read out from `min` / `max` / the current value. The element itself has no name, so **always give it an accessible name** with `aria-label` or by associating a `label` element with an `id`. `input` is a labelable element, so `htmlFor` on `label` works (it does not with `SliderClient`). The value is read out but not shown on screen, so add text alongside it when the user should see the number.

Override thickness and width with `className`. The track and thumb are rendered with different pseudo-elements per browser, so the styles target four of them: `::-webkit-slider-runnable-track` / `::-webkit-slider-thumb` / `::-moz-range-track` / `::-moz-range-thumb`. The track is `bg-border` and the thumb `bg-foreground`. The focus indicator is given with `outline`.

**It does not fill the selected range.** The track is a single color from end to end, and only the thumb's position conveys the value. The only pseudo-element that draws a fill is Firefox's `::-moz-range-progress`; Chrome / Safari have no counterpart. Filling on only one side makes the affordance differ between browsers, and substituting `linear-gradient` needs JavaScript that tracks value changes, which removes the reason this component has no client runtime. When a fill is needed, use `SliderClient`.

shadcn/ui's `slider` is not copied in here. The generated output is a Radix client component and demands hydration for single-value input. The same generated output is brought in as `SliderClient`.

## Storybook and Tests

Storybook checks the default range, discrete values with `step`, a range in real units, disabled, association with a `label` element, and placement in a native form.

The tests check that it is exposed with the `slider` role, that it is `type="range"`, that `min` / `max` / `step` / `name` come out as native attributes, that interaction changes the value, the accessible name via `label` element association, disabled, overriding `className`, and the automated a11y check.

# ProgressClient

## Purpose

Visually shows progress that is updated in the browser, as the relationship between a value and a maximum.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ProgressClient` | Display primitive in a client island that renders the progress portion as a separate element. It takes `value` and `max` as props and renders only the progress ratio. |

Override the look of the outer frame with `className`, and of the progress portion with `indicatorClassName`.

## Use Cases

- Updating a value measured in the browser at short intervals, such as the amount of a file sent
- Avoiding the cross-browser differences in look caused by pseudo-elements

If the progress is merely settled in the URL or on the server, use `ProgressNative`. Do not use it for a wait whose end is unknown; when showing a skeleton is enough, use `Skeleton`.

## Responsibility Boundaries

In the SSR-first selection it is rated `△`. The default is `ProgressNative`; choose this one once the requirement to update the value continuously in the browser is settled. It needs hydration and cannot be rendered directly from a Server Component. The caller's client island holds and updates the value; this component holds no state, no timer, and no subscription. It also does not own fetching, navigation after completion, or formatting the percentage text.

`value` is required. Indeterminate progress is out of scope. `Skeleton` / `Shimmer` handle the representation of waiting, so the progress components take on only progress whose value is known ([0051](../../../../../docs/adr/0051-styling-system.md)).

It is exposed with the `progressbar` role, and the value is announced as a percentage derived from `value` and `max`. The element has no name of its own, so **always give it an accessible name** with `aria-label` or `aria-labelledby`. Unlike `ProgressNative`, the underlying element is a `div` and not a labelable element, so **`label`'s `htmlFor` does not name it**. To associate it with heading text, reference that element's `id` from `aria-labelledby`.

The width of the progress portion is computed from the ratio of `value` to `max`. When the value changes, the width change is interpolated with a CSS transition, and is not interpolated under `prefers-reduced-motion`. When the update interval is shorter than the default transition, pass `duration-*` and an easing in `indicatorClassName` to match.

Override thickness and width with `className`. The defaults are `h-2 w-full`, `bg-border` for the track and `bg-foreground` for the progress portion — the same combination as `ProgressNative`.

The vendor is currently Radix, but the public API carries no vendor name.

## Storybook and Tests

Storybook covers the default display, a value of `0`, the completed state at `max`, `max` in real units, updating the value to see the interpolation, naming it with `aria-labelledby`, and changing the thickness with `className`.

The tests cover exposure with the `progressbar` role, that `aria-valuenow` / `aria-valuemax` are emitted, that the progress portion's width is the ratio of `value` to `max`, the edge handling when the value is `0` and `max`, that the caller's updates reach the display, the accessible name via `aria-labelledby`, overriding `className`, and the automated a11y check.

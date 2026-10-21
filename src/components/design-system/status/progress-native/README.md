# ProgressNative

## Purpose

Visually shows how far a process of known length has progressed, as the relationship between a value and a maximum.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ProgressNative` | Display primitive that gives the native `progress` element a default look. It takes `value` and `max` as props and renders only the progress ratio. |

## Use Cases

- Progress that is settled in the URL or on the server, such as a step indicator for a procedure
- Showing what remains of a process whose `max` has real units, such as a count or a number of steps

When updating a value measured in the browser at short intervals, use `ProgressClient`. Do not use it for a wait whose end is unknown; when showing a skeleton is enough, use `Skeleton`.

## Responsibility Boundaries

In the SSR-first selection it is rated `◎`. The native `progress` element satisfies the needed semantics and display, so it has no `"use client"`, no React state, and no browser API. The caller owns fetching the value, the update interval, navigation after completion, and formatting the percentage text.

`value` is required. Indeterminate progress is out of scope. Native `progress` shows an indeterminate display when `value` is omitted, but that rendering depends on the browser implementation, and `Skeleton` already handles the representation of waiting.

The `progress` element is exposed to screen readers as `progressbar`, and the value is announced as a percentage derived from `value` and `max`. The element has no name of its own, so **always give it an accessible name**, with `aria-label` or by associating a `label` element through `id`. `progress` is a labelable element, so `label`'s `htmlFor` works (it does not for `ProgressClient`). Even when `max` uses real units the announcement is a percentage, so when the count or similar should be shown to the user, add numeric text alongside.

Override thickness and width with `className`. The defaults are `h-2 w-full`, `bg-border` for the track and `bg-foreground` for the progress portion. Each browser renders the track and the progress portion with different pseudo-elements, so the styles are specified on all three: `::-webkit-progress-bar` / `::-webkit-progress-value` / `::-moz-progress-bar`. If this pseudo-element difference becomes a problem as visual inconsistency, use `ProgressClient`.

shadcn/ui's `progress` is not copied in here. The generated code is a Radix client component and would require hydration to display a settled value. The same generated code is brought in as `ProgressClient`.

## Storybook and Tests

Storybook covers the default display, a value of `0`, the completed state at `max`, `max` in real units, numeric text added alongside, and changing the thickness with `className`.

The tests cover exposure with the `progressbar` role, that `value` and `max` are emitted as native attributes, that `max` defaults to `100`, that an accessible name can be given both with `aria-label` and with a `label` element, overriding `className`, and the automated a11y check.

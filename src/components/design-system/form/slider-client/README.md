# SliderClient

## Purpose

Specifies a number or a range through continuous interaction. Being able to choose the lower and upper bound on one control surface is what distinguishes it from `SliderNative`.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SliderClient` | A client island form component that assembles the track, the selected range and the thumbs. The number of thumbs is decided from the array of values. |

## Use Cases

- Range input that specifies the lower and upper bound at once, such as a price range
- Reflecting the selected value immediately in another display
- Showing the selected range with a distinct fill (`SliderNative` cannot do this because of the pseudo-element constraint)

When choosing a single value is enough, use `SliderNative`, which goes into a native form as is.

## Responsibility Boundaries

In the SSR-first selection it is the exception to `◎`. The default is `SliderNative`; choose this one when **multiple thumbs**, which the catalog lists as a condition for a client island, or complex value synchronization are needed. It needs hydration and cannot be rendered directly from a Server Component. Holding and committing the value, reflecting it in `searchParams`, and submission belong to the caller.

Passing `value` makes it a controlled component and `defaultValue` an uncontrolled one. When both are omitted, it places one thumb with `min` as its initial value. The number of thumbs matches the number of values.

What carries the name is **each thumb**, not the outer frame. The `slider` role sits on the thumb, so passing `aria-label` or `aria-labelledby` to the outer frame does not become the name. Pass names to `thumbLabels` in the same order as the values. For range input, use names that say which end it is, such as 「下限価格」 ("minimum price") and 「上限価格」 ("maximum price").

`aria-valuemin` / `aria-valuemax` refer to the `min` / `max` of the whole slider, not the movable range of each thumb. To tell the user in range input that "the lower bound does not exceed the upper bound", supplement it with the names or accompanying text.

`orientation="vertical"` makes it vertical. In that case give the height with `className`.

The track is `bg-border` and the selected range `bg-foreground`, so that they are clearly distinct in both light and dark. In range input "from where to where is selected" is the only information, so the difference between track and selected range is a requirement of this component. The thumb has a `bg-background` surface and a `border-foreground` outline, so its position is clear both over the selected range and over the background.

The vendor is currently Radix, but the public API contains no vendor name.

## Storybook and Tests

Storybook checks a single thumb, a range, discrete values with `step`, disabled, vertical orientation, and a controlled component shown alongside its value.

The tests check that one thumb is placed per value, the defaults when `value` / `defaultValue` are omitted, `aria-valuenow` and `aria-valuemin` / `aria-valuemax` pointing at the whole value range, value changes by keyboard and notification to the caller, reflection as a controlled component, per-thumb accessible names via `thumbLabels`, disabled, overriding `className`, and the automated a11y check.

# ScrollFade

## Purpose

A CSS foundation that fades the edges of a scrolling area to show that there is more. It exports no React component.

| utility | Direction |
| --- | --- |
| `scroll-fade-x` | Horizontal |
| `scroll-fade-y` | Vertical |

## When to Use

**Only on areas whose scrollbar has been removed.** [`scrollbar`](../scrollbar/README.md) always shows existence, remaining amount and current position, so areas with a scrollbar do not need this effect.

It is needed on areas with `scrollbar-none` applied. There, nothing else indicates that there is more. `AttachmentGroup` is such a case.

```tsx
<ScrollArea aria-label="…" className="scroll-fade-x flex gap-3 scrollbar-none" orientation="horizontal">…</ScrollArea>
<ScrollArea aria-label="…" className="scroll-fade-y flex flex-col gap-3 scrollbar-none">…</ScrollArea>
```

A scrolling area must also be reachable by users who operate only with the keyboard, so do not apply `overflow-*` directly; apply it to [`ScrollArea`](../../container/scroll-area/README.md).

On an area whose content fits, it is nothing but edge decoration. Apply it only to areas that can overflow.

## Behavior

The fade is removed on the side that has reached its edge. At the start the near edge is not faded, and scrolling to the end removes the fade on the far edge, so even without a scrollbar "at the start" and "there is more" can be told from the look of the edges alone.

Tracking uses scroll-driven animation, wrapped in `@supports`. Where it is unavailable, it stays with both edges faded. A missing cue when there is more is worse than a fade when there is nothing more, so it errs on that side.

The fade width is `--scroll-fade-size`, with a default of 6 (in units of `--spacing`).

## The two directions cannot be combined

Putting `scroll-fade-x` and `scroll-fade-y` on the same element does not fade both directions. Both use `mask-image`, so only the one applied last remains. Do not use it on areas that scroll in both directions.

## Implementation Constraints

The fade amount per edge is held not as a length but as **a ratio from 0 to 1**. Animating a length itself in keyframes would put `var()` in the value, which is not resolved as a keyframe of a registered custom property, and the whole animation becomes invalid. With a ratio the keyframes can be written with constants only, so the fade width stays in one place on the utility side.

## Responsibility Boundaries

It owns neither the scroll area itself, whether to remove the scrollbar, nor how the content is laid out. The caller decides whether to apply it.

## Storybook

For both horizontal and vertical, it places the case with the scrollbar removed beside the case with a scrollbar, so you can compare where it should be used. The case where the content fits is also included.

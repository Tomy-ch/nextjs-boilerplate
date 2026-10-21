# AspectRatio

## Purpose

Fits a child element into a frame with the specified aspect ratio.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AspectRatio` | An SSR-first display primitive that creates a frame with the aspect ratio given by `ratio`. |

## Use Cases

Used where you want to specify **an arbitrary ratio** numerically, such as a frame for an embedded video, an inserted map, or a placeholder without an image.

When the ratio is one of `square` / `standard` / `wide` and you want the frame to match `MediaImage`, applying `MEDIA_IMAGE_ASPECT_RATIO_CLASS` directly as a class is lighter. This component is the fallback for when a numeric value is needed.

## Responsibility Boundaries

It only creates the ratio frame and does not own fetching content, loading state, or image optimization. To display an image, use `MediaImage`.

It carries `overflow-hidden` because CSS `aspect-ratio` yields to the content's height and stretches vertically. When content taller than the frame is put in, the ratio wins and the overflow is clipped.

## Why the Implementation Differs from Upstream

The registry item is `aspect-ratio`, but Radix's implementation is not copied in; it is implemented here (the manifest's `kind` is `reimplemented`).

The Radix version uses the older `padding-bottom` ratio lock, and the following 2 points do not fit this repository's policy.

1. **It ignores the constraint inside a parent with a fixed height.** Putting 16:9 into a parent 120px tall makes the child 225px, breaking through the parent. CSS `aspect-ratio` computes the width back when the height is fixed, so this breakdown does not happen
2. **It requires `"use client"`.** That brings hydration into a display that CSS can complete on its own, against the SSR-first selection policy

There is no condition under which the upstream version is better.

`ratio` in the public API matches upstream, so users coming from shadcn/ui can use it as is.

## Storybook and Tests

Storybook checks a 16:9 frame, an arbitrary ratio and the default square, content taller than the frame, inside a parent with a fixed height, and matching the frame to `MediaImage`. Tests check that the specified ratio becomes CSS `aspect-ratio`, that the default is square, that overflow is clipped, that it renders without the client runtime, extension through `className` and `style`, and automated a11y checks.

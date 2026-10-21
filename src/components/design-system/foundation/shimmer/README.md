# Shimmer

## Purpose

Shows that a process whose progress cannot be measured is still running, with a band flowing across the surface.

## Usage

An opt-in CSS foundation applied simply by adding the `shimmer` class. It exports no React component.

```tsx
<div className="shimmer h-16 rounded-md bg-muted" />
```

To show it depending on state, compose it with a Tailwind variant.

```tsx
<span className="group-data-[state=uploading]/attachment:shimmer">{fileName}</span>
```

## How It Differs from `Skeleton`

| | What it conveys |
| --- | --- |
| `Skeleton` (`animate-pulse`) | There is a box here |
| `shimmer` | It has not stopped |

It is not a replacement. For long processes where you want to show the shape while loading and also convey that "it is still running", use both.

**They cannot go on the same element.** `animate-pulse` and `shimmer` both use the `animation` property, so only the one applied last remains. To show both, layer it as a child of `Skeleton`.

```tsx
<Skeleton className="h-16 w-full">
  <div className="shimmer size-full rounded-md" />
</Skeleton>
```

## Why It Must Be Combined

Under `prefers-reduced-motion` the band disappears entirely. If only the band remained when motion stops, a frozen decoration would sit on the screen.

**In the disappeared state nothing conveys that processing is under way.** Always combine it with `Skeleton` or waiting text. This is the caller's responsibility.

## How the Look Is Decided

The band's color is made from the foreground color. A fixed "bright band" would sink into the background in the light theme, so it is taken from the side that contrasts with the surface in either theme.

The band's width is 40% of the surface. As wide as the surface, it would look like the whole thing blinking rather than flowing.

The cycle is 1.6 seconds. Slower looks stopped and faster grabs attention, so it sits in between. The band starts and ends outside the surface, so it looks as if it passes through rather than appearing and disappearing at the edges.

## Responsibility Boundaries

It owns neither deciding whether processing is under way, the waiting text, nor how long it is shown. The caller decides whether to apply it.

When applied to text, the band passes behind the text. The text color itself does not change, so it stays readable.

## Storybook

It checks applying it to a surface, applying it to text, layering it with `Skeleton`, and the look when motion is stopped.

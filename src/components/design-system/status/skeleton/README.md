# Skeleton

## Purpose

Temporarily shows a shape close to the final content while it loads.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Skeleton` | Decorative loading placeholder. It carries no loading message for the user and is hidden with `aria-hidden`. |

## Use Cases

Use it to show the shape of a heading, body text, an image or a row that is being fetched. Place text conveying the meaning of loading, or a `FeedbackState`, nearby.

## Responsibility Boundaries

As a Server Component it provides only the look. The feature manages the decision about the fetch state, the final content, the loading message, and the display duration. Under `prefers-reduced-motion` the animation stops.

## Storybook and Tests

Storybook covers representative placeholder shapes; the tests cover the decorative element, the motion-suppression class, and a11y.

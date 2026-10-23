# Skeleton

## Purpose

Temporarily shows a shape close to the final content while it loads.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Skeleton` | Decorative loading placeholder. It carries no loading message for the user and is hidden with `aria-hidden`. |

## Use Cases

Use it to show the shape of a heading, body text, an image or a row that is being fetched. That loading is under way is told to assistive technology by a `LoadingAnnouncement` placed in the same fallback ([`loading-announcer`](../../../shell/loading-announcer/README.md)), not by text beside the skeleton.

## Responsibility Boundaries

As a Server Component it provides only the look. The feature manages the decision about the fetch state, the final content and the display duration; the loading announcement is `loading-announcer`'s. Under `prefers-reduced-motion` the animation stops.

## Storybook and Tests

Storybook covers representative placeholder shapes; the tests cover the decorative element, the motion-suppression class, and a11y.

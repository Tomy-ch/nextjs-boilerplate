# HoverCard

## Purpose

Shows brief supplementary information near the trigger in response to hover or keyboard focus.

## Role and Public Components

| Component | Role |
| --- | --- |
| `HoverCard` | The client-side root that manages the open state and the hover / focus interaction. |
| `HoverCardTrigger` | The trigger that opens the HoverCard. When using a link or button, compose it with `asChild`. |
| `HoverCardContent` | The supplementary content shown in a Portal. Its position can be adjusted with `align` and `sideOffset`. |

## Use Cases

Use it to add a brief supplement to a link or a name. Do not put information essential to an operation or decision only in a HoverCard; also provide an always-visible display or an explicit path.

## Responsibility Boundaries

It is a client island that needs hydration for the Portal and interaction. It holds no supplementary text, fetching, business decisions or alternative path on mobile. When the content is needed on touch devices, the feature decides how to show it.

## Storybook and Tests

Storybook checks display on hover and the open state; the tests check the trigger, the Portal content and a11y.

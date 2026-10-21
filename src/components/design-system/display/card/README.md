# Card

## Purpose

Makes related information and auxiliary actions into one visual group.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Card` | The outer frame that wraps related information and actions. |
| `CardHeader` | The region that gathers the heading, description and in-header actions. |
| `CardTitle` | The heading that states the Card's subject. |
| `CardDescription` | Descriptive text that supplements the heading. |
| `CardAction` | The region for auxiliary actions placed at the end of the header. |
| `CardContent` | The region for the Card's main content. |
| `CardFooter` | The region for auxiliary information or actions following the main content. |

## Use Cases

Used to display an overview, auxiliary information, summary values and the like as one group.

## Responsibility Boundaries

It does not own business types, fetching, destinations, or the click area. Semantics and actions are assembled by the feature.

## Storybook and Tests

Storybook checks the basic composition with a heading, body and auxiliary actions; tests check subcomponent composition, extending className, and a11y.

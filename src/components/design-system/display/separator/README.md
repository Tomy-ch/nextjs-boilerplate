# Separator

## Purpose

Separates groups of adjacent content.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Separator` | A horizontal / vertical dividing line. `decorative` chooses between a horizontal rule with semantics and a purely decorative line. |

## Use Cases

Use it to visually separate details, supplements and parallel pieces of information.

## Responsibility Boundaries

It holds no actions, state, spacing or business meaning. The feature decides whether to use it purely as decoration or give it semantics.

## Storybook and Tests

Storybook checks horizontal / vertical; the tests check the orientation and a11y.

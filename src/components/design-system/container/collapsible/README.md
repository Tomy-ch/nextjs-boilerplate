# Collapsible

## Purpose

Lets the user check one piece of auxiliary content by opening it only when needed.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Collapsible` | One open/close region using native `details`. |
| `CollapsibleTrigger` | As a native `summary`, provides the region's heading and the open/close action. |
| `CollapsibleContent` | The auxiliary content shown when opened. |

## Use Cases

Used to reveal one group step by step, such as notes, supplementary settings, or a long explanation.

## Responsibility Boundaries

It is SSR-first native `details` / `summary`, and no hydration is needed. It does not own syncing with external state, open/close animation, or non-standard keyboard interaction. Add a client island only when those become necessary.

## Storybook and Tests

Storybook shows the closed state and the display opened initially; the initial open can be checked with Controls and the native `toggle` with Actions. Tests check native opening/closing, initial open, and a11y.

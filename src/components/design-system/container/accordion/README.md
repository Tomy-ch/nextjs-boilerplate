# Accordion

## Purpose

Lets the user check several related details by opening only the items they need.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Accordion` | The outer frame that groups several items vertically. |
| `AccordionItem` | One open/close item using native `details`. |
| `AccordionTrigger` | As a native `summary`, provides the item's heading and the open/close action. |
| `AccordionContent` | The detail content shown when the item is opened. |

## Use Cases

Used to display supplementary information, groups of settings, or explanations shown step by step on narrow screens. Suited to content where several items may be open at once.

## Responsibility Boundaries

It is SSR-first native `details` / `summary`, and no hydration is needed. It does not own control that keeps only one item open at a time, syncing the open state externally, animation, or advanced keyboard interaction. Add a client island only when those become necessary.

## Storybook and Tests

Storybook shows the normal state with all items closed and the state with several items open; each item's initial open can be checked with Controls and the native `toggle` with Actions. Tests check native opening/closing, initial open, and a11y.

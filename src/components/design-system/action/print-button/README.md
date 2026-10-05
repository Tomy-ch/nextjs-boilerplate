# PrintButton

## Purpose

The action that prints the document being displayed. It accompanies screens the user wants to keep a copy of, such as receipts, statements and specifications.

## Role and Public API

| Component | Role |
| --- | --- |
| `PrintButton` | A client island that calls `window.print()`. |

It has no props. The copy and look are fixed, and the result of pressing it is the browser's print dialog.

## It does not own what goes on paper

It does not specify what to print. `window.print()` targets the whole document, and whether something goes on paper is decided by the `print-hidden` / `print-only` attached to each element ([`foundation/print`](../../foundation/print/README.md)). Cutting the range here would split the same decision between the action side and the display side, producing screens where only one was fixed.

This action itself carries `print-hidden`. An unpressable action left on paper pushes the content out by that much.

## Responsibility Boundaries

It does not own the presentation on paper (margins, page breaks and repeating table header rows belong to the print base).

It does not own PDF generation either. Building it on a server is the backend's responsibility (ADR [0070](../../../../../docs/adr/0070-backend-role-separation.md)).

## Storybook and Tests

Storybook checks the default and placing it next to content that goes on paper. The difference from paper is not visible on screen, so the look is checked in the browser's print preview.

Tests check the accessible name, that printing starts when pressed, that it does not start until pressed, that it carries `print-hidden` itself, and automated a11y checks.

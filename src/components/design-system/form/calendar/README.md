# Calendar

## Purpose

Selects a date or a date range.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Calendar` | A client-side calendar that provides date and date-range selection, keyboard operation and month navigation. |
| `CalendarDayButton` | The interactive element representing one day. Normally `Calendar` uses it internally; specify it only to replace the display. |

## Use Cases

Use it to select a date such as a publication date, or a range of start and end dates. When only a date is entered directly, prefer the native `input type="date"`.

## Responsibility Boundaries

It is a client island that needs hydration because of `react-day-picker`. It owns neither date-time and time zone conversion, the form submission value, saving, nor the business decision of which days are available. The feature connects the selection to a form or a Server Action.

## Storybook and Tests

Storybook checks a single date, a date range and unselectable dates; the tests check the grid semantics, date selection and a11y.

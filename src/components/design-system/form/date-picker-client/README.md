# DatePickerClient

## Purpose

Selects a single date from a calendar popup.

## Role and Public Components

| Component | Role |
| --- | --- |
| `DatePickerClient` | Composes `Calendar` and `Popover`, and passes the selected value to a hidden input and a callback. |

### Value format and time zone

Selection in `Calendar` uses a JavaScript `Date` internally, but the exposed value is a `YYYY-MM-DD` string. Both `onValueChange` and the hidden input use this format. No `Date` is returned, so callers must not assume they receive a date-time type directly.

This keeps browser and server time zone conversion away from date-only values such as birthdays and publication dates. To handle an instant that includes time and time zone, the caller decides the TZ and converts to a date-time, or uses a different date-time component.

## Use Cases

Use it for single-date input that needs calendar interaction or a popup, such as a publication date.

## Responsibility Boundaries

It is a client island that needs hydration for opening / closing and selection. It owns no range, time, time zone conversion, saving or validation. When a single date can be entered directly, prefer `Input type="date"`.

## Storybook and Tests

Storybook checks normal, an initial value and disabled; the tests check the initial value, the hidden form value, opening / closing, disabled and a11y.

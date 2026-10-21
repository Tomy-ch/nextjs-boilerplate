# AmountWithReference

## Purpose

An amount in the base currency, and a reference conversion into another currency that appears on toggle. Used where the settled amount is a single one, yet readers want to grasp its size in a currency they are used to.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AmountWithReference` | A client island that displays the amount and the reference conversion. It holds the toggle's pressed state itself. |

## The base-currency amount always stays displayed

The toggle **only adds** one reference line and does not replace the base-currency amount. Replacing it would make it impossible to read which currency's amount is the settled one.

**When the reference conversion is `null`, the toggle itself is not shown.** With an action that makes nothing appear when pressed, the user cannot tell whether it failed or is unsupported.

The rate and its reference date are shown alongside. Without knowing which day's market the estimate is based on, it is no use as a reference.

## Responsibility Boundaries

**It does not own what the amount is.** The heading is received as `label`. Whether it is a total or a subtotal is decided by the caller.

It owns neither the conversion itself nor what happens when conversion fails. Looking up the value is the responsibility of `adapters`, and failure to read it is passed in as `null`.

## Storybook and Tests

Storybook checks the default, the size placed alongside, and the case with no reference conversion. Tests check displaying the amount, the reference amount appearing on toggle, that no action is shown when it is `null`, and automated a11y checks.

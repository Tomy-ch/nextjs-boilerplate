# InvalidQueryFeedback

## Purpose

When the conditions in the URL fall outside the contract, shows the reason and a way to clear them in place of the main content.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `InvalidQueryFeedback` | Gathers the title, copy, offending keys and the way to clear them into one Alert. |
| `InvalidQueryFeedbackProps` | The public props. |

## Use Cases

- When a list's filter conditions were outside the range of the contract
- When an aggregation's period did not match the shape of the contract

In both, **the user can edit the URL directly**, so these are situations that may not be recoverable through on-screen interaction alone.

## Responsibility Boundaries

**It has no option of discarding out-of-range conditions and showing the default result.** If they are discarded, a user who believes they filtered reads unfiltered results, or numbers for a period other than the one they believe they specified, without being able to tell. Whether to show this in place of the main content is decided by the caller.

**It does not own the display names of keys.** Which key means what is known by the screen that owns the URL contract. What this component owns is only the fallback of showing a key that is not in the table **as is**. If each screen had a table transcribing the display names, then when a key is added to the contract, screens would split into those that show the raw name and those that do not.

**It does not own where to return to either.** The destination and copy for clearing differ per screen, and `app-starter` does not know routes.

**It owns no validation.** What fell outside the contract is decided by the fetch endpoint (`adapters`); this component only receives the result.

It holds no state, so it needs no hydration. It can be rendered from a Server Component as is.

## Storybook and Tests

Storybook checks the cases with several offending keys, with none, with keys not in the table mixed in, and with the title and link replaced.

Tests check that the title and copy appear, that keys are converted to display names, that keys not in the table appear as is, that the row is not shown when there are no keys, that the clearing link points to the destination given, and automated a11y checks.

# Alert

## Purpose

Communicates a caution, a failure, or the next action the user should take, within context.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Alert` | The whole notice, carrying `role="alert"`. `variant` selects the default, warning, or destructive look. |
| `AlertTitle` | Heading that briefly summarizes the notice. |
| `AlertDescription` | Region for the details, the impact, and the next action to take. |

## Use Cases

Use it for information that must be conveyed immediately within the screen: why something could not be saved, a request to check the input, a supplement to a processing result.

## Responsibility Boundaries

As a Server Component it handles display only. The feature owns state decisions, fetching, retrying, dismissal, and business wording. For a failure that requires the user to act, compose the needed link or Button into `AlertDescription`.

## Storybook and Tests

Storybook covers default, warning, destructive, and an auxiliary action; the tests cover the `alert` semantics, the variants, and a11y. Warning is for a caution and destructive for a processing failure; each combines a pale background, a heading and an icon to convey meaning without relying on color alone.

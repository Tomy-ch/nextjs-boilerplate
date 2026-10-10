# Popover

## Purpose

Opens supplementary content or auxiliary actions next to the trigger, so they can be consulted or adjusted without leaving the screen.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Popover` | Client-side root that manages the open state and the outside-click and Escape interactions. |
| `PopoverTrigger` | Trigger that opens and closes the Popover. When using a `Button` or a link, compose it with `asChild`. |
| `PopoverContent` | Content shown in a Portal. Adjust its position with `side` / `align` / `sideOffset`. |
| `PopoverAnchor` | Specifies the element used as the positioning reference when it differs from the opening control. |
| `PopoverHeader` | Region that groups the heading and the description. |
| `PopoverTitle` | Heading that names the subject of the content. |
| `PopoverDescription` | Description that supplements the heading. |

## Use Cases

Use it for content that should open and close without leaving the main flow: a list's filter conditions, reference information about a value, auxiliary settings. Do not use it to confirm an irreversible action; use `AlertDialog` for that.

## Responsibility Boundaries

A client island that needs hydration for position calculation, outside clicks, Escape and focus management. It does not own the text it displays, fetching, business decisions, or the choice of whether to put the open state in the URL. When the content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

`PopoverContent` carries `role="dialog"`, so always give it an accessible name, with `aria-label` or with `aria-labelledby` pointing at the `id` of `PopoverTitle`. When adding a `PopoverDescription`, reference its `id` from `aria-describedby`. Information reachable only by opening the popover is missed by assistive technology and touch environments, so for content essential to an action or a decision the feature also provides an always-visible display or an explicit path to it.

The surface sits on top of the page content, so it is rendered opaque with the semantic tokens `bg-background` for the background and `border-border` for the border. For a class with no token definition Tailwind emits no CSS, and the surface stays transparent, overlaps the text behind it and loses contrast.

The vendor is currently Radix, but the public API carries no vendor name.

## The Incomplete Result in the Storybook a11y Panel

The Storybook a11y panel lists `aria-valid-attr-value` as incomplete (needs manual review). This is not a violation, and nothing needs to be done about it.

For the `aria-controls` of an element with `aria-haspopup`, axe does not check whether the referenced ID exists and uniformly marks it as needing review. "Unable to determine if aria-controls referenced ID exists" means "did not check", not "could not decide". The trigger's `aria-haspopup="dialog"` and `aria-controls` are correct markup per the ARIA APG; removing them loses the association between the popover and its content.

The check axe left to a human is replaced by a test verifying that `aria-controls` matches the `id` of the `PopoverContent` that actually exists. The item does not appear for the modal `AlertDialog` because, while it is open, the trigger falls under `aria-hidden` and drops out of the scan; it is not a defect on the popover side.

## Storybook and Tests

Storybook covers the default open and close, the heading and description in the open state, placement with `side` / `align`, form components placed in the content, and a separate reference element via `PopoverAnchor`. The tests cover that the content is not rendered until opened, the trigger's `aria-expanded`, that `aria-controls` points at content that exists, the accessible name and description of the Portal content, that the surface is opaque, closing with Escape, composition with `PopoverAnchor`, and the automated a11y check.

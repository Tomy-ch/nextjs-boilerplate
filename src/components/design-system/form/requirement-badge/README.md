# RequirementBadge

## Purpose

Shows next to the label whether an input item is required or optional.

## Role and Public Components

| Component | Role |
| --- | --- |
| `RequirementBadge` | Takes `required` and renders a 「必須」 (required) or 「任意」 (optional) mark. |

## Use Cases

Use it in forms that list several items, to show at a glance which must be filled in before the form can be sent. Do not place it in a form with only one item, or in a form where every item is required without exception. There the mark simply appears on every item and gives nothing to tell apart.

## Responsibility Boundaries

**It does not decide whether an item is required.** The caller derives that from the validation schema and passes it. Deciding it here would make it possible for a rule to be relaxed while the screen still shows the item as required.

**It does not tell assistive technology that the item is required.** That is the job of `aria-required` on the control; this mark carries `aria-hidden`. If both were read, it would double up, as in 「姓、必須、required」 ("last name, required, required"). **The caller is the one who sets `aria-required`.**

Do not put it inside the `label` element. Doing so changes the item's accessible name to 「姓必須」 ("last name required"), and lookups by name no longer match. Place it next to the `label`.

## Visual Decisions

It is not filled. A fill would give it the same weight as an error indicator, and a screen with nothing wrong would show a red block for every item. Errors are shown by their text and the border color, so the mark does not need to be that strong.

The mark also appears on the optional side. If presence or absence of the mark were what told them apart, there would be no way to tell whether a missing mark means "optional" or "someone forgot to add the mark". Both texts are two characters long, so placing it before the `label` aligns the column of marks and the start of the labels at the same time.

## Storybook and Tests

Storybook shows the two cases, required and optional. The tests check that the text switches and that it is excluded from screen reading (`aria-hidden`).

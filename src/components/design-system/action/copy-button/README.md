# CopyButton

## Purpose

The action that copies a value to the clipboard. It accompanies values the user pastes elsewhere, such as identifiers, URLs and API keys.

## Role and Public API

| Component / Value | Role |
| --- | --- |
| `CopyButton` | A client island that copies a value to the clipboard. |
| `COPY_FEEDBACK_MS` | How long (in milliseconds) the copied cue stays displayed. |

It accepts `Button`'s props as they are (except `children` / `onClick` / `type`).

## A name is required

`label` is required. An icon-only action has no discernible purpose for assistive technology without a name. Several copy actions sit on the same screen, so use **words that say what is being copied**, such as 「識別子を写す」 ("copy identifier").

Right after copying, a word for screen readers only is put into a live region. The marker changing to a check alone does not tell users who are not looking at the screen whether it succeeded.

## Failure does not stop anything

The clipboard is available only in secure contexts, and the user may not grant permission. On failure it throws no exception and merely shows no cue. **Do not build paths on the feature side that assume the copy succeeded.**

## Why this is not a `capabilities` hook

What is worth reusing is not a browser capability but "the action that copies and tells you it was copied". Calling `navigator.clipboard.writeText` is one line, and everything else is a UI decision.

| Element | Kind |
| --- | --- |
| `navigator.clipboard.writeText` | Browser capability |
| Making the name required | UI decision |
| Announcing the copied word | UI decision |
| How long until the cue resets, and clearing it on unmount | UI state management |
| Merely showing no cue on failure | UI policy |

Only the first row could move into a hook; the rest would stay at each usage site. **At the point where copying is needed from a surface other than a button** (a surface that is not a `button`, such as a `DropdownMenu` item or a keyboard shortcut), extract the shared part into a `capabilities` hook and move this component to use it too.

## Responsibility Boundaries

It does not own formatting the string to copy. Pass the same preformatted string so that the displayed value and the copied value do not diverge. Formatting is owned by the formatters in `model/`.

It does not own recording whether the copy succeeded, retrying, or notifications.

## Storybook and Tests

Storybook checks the default, a changed cue copy, a changed look, and placing it next to a value. Tests check the accessible name, copying to the clipboard, showing the cue and its disappearance after a set time, replacing the copy, not throwing when the clipboard is unavailable, and automated a11y checks.

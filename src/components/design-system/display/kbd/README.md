# Kbd

## Purpose

Displays a key the user presses as keyboard input.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Kbd` | Displays a single key as a `kbd` element. |
| `KbdGroup` | Lays out several keys as one action. |

## Use Cases

Used where the keyboard means of running an action is shown, such as at the right end of a menu item, as a hint in a search field, or within instructional text.

For combinations with modifier keys, do not pack a string such as `⌘K` into a single `Kbd`; lay out the individual keys with `KbdGroup`. Keys pressed in sequence are shown with spacing or wording that distinguishes them from a combination.

## Responsibility Boundaries

It only displays; it neither registers shortcuts nor listens for keydown. The caller provides the actual key handling. It does not own per-platform notation either (`⌘` vs `Ctrl`).

It does not make users infer the action from the key. Adjacent copy conveys what happens, and `Kbd` shows only the means. When the corresponding action cannot be run from the keyboard, do not display it.

## Accessibility

The `kbd` element has the semantics of "a key the user presses". Unlike a `span` styled to look the same, assistive technology can treat it as key input.

`KbdGroup` nests `kbd` because that is how the HTML specification represents a combination: the outer one represents "one input" and each inner `Kbd` represents "an individual key".

## Storybook and Tests

Storybook checks a single key, a combination with modifier keys, a separator symbol between keys, placement within text, and keys pressed in sequence. Tests check that it renders as a `kbd` element, extension through `className`, that a group becomes nested `kbd`, that it is read continuously with the surrounding text, and automated a11y checks.

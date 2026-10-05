# KeyValueList

## Purpose

Displays pairs of item names and values in a list. Used for regions where "what" and "what state it is in" repeat, such as a subject's attributes, setting values, or a summary.

## Role and Public Components

| Component / Value | Role |
| --- | --- |
| `KeyValueList` | The `dl` that lays out the pairs. |
| `KeyValueItem` | Groups a label and value pair into one row. Stacks vertically at narrow widths and lays out horizontally at `sm` and above. |
| `KeyValueLabel` | The item name (`dt`). |
| `KeyValueValue` | The item's value (`dd`). Long values wrap. |
| `KeyValueEmpty` | The display indicating there is no value. The symbol is hidden from assistive technology, and a word for screen readers is added. |

## Use Cases

- On a details screen, showing a subject's attributes together
- On a settings screen, listing the current setting values read-only
- Showing values the user pastes elsewhere, such as identifiers (add a [`CopyButton`](../../action/copy-button/README.md))

Not used for tabular data compared along two axes. When both column headings and row headings carry meaning, use `Table`.

## Responsibility Boundaries

In the SSR-first selection it falls under `◎`. `KeyValueList` through `KeyValueEmpty` only render native `dl` / `dt` / `dd`, need no hydration, and can be rendered directly from a Server Component.

It does not own formatting values. Pass dates, amounts and ratios as strings formatted through the formatters in `model/`. It does not own the order of items, deciding whether to show them, or fetching either.

### Keep the row even for items with no value

`KeyValueEmpty` is for showing "no value" without removing the row. That the item exists is itself information, and removing it shifts the other items and makes them harder to read.

A symbol (`—`) alone means nothing when read aloud, so the symbol is hidden with `aria-hidden` and a separate word for screen readers is placed. The default is 「未設定」 ("not set"), and it can be changed with `children`.

### Compose the copy action

The copy action composes [`CopyButton`](../../action/copy-button/README.md). It handles the clipboard and so needs hydration, while the list itself stays a Server Component. The copy action is needed in places other than key-value lists too, so it is not owned as part of this list.

The string to copy and the handling on failure are described in `CopyButton`'s README.

## Storybook and Tests

Storybook checks the basic composition, items with no value, long values and values containing line breaks, adding a copy action, and laying out several lists separated by dividers. Stacking at narrow widths and the horizontal layout at `sm` and above can be judged only by actual rendering, so the responsive look is within Storybook's scope.

Tests check the `dl` / `dt` / `dd` semantics, that a pair groups into one row, that the row remains even for an item with no value, that the empty-value symbol is hidden from assistive technology and a word for screen readers is added, that the word can be changed, that native attributes pass through as is, and automated a11y checks.

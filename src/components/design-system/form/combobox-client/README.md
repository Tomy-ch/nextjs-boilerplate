# ComboboxClient

## Purpose

Selects one item from many options while narrowing them down with typed text.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ComboboxClient` | A client island that combines the trigger, the filter input, the option list and a hidden input for the selected value. |
| `ComboboxClientOption` | The type representing one option. Has `value` (the submitted value), `label` (what is shown and searched) and `disabled`. |

## Use Cases

- A selection with so many options that finding one in a list is hard, such as prefectures or categories
- A selection that should be searched by its display text while the submitted value is an identifier

If the options are few and static, prefer `SelectNative`. Using it where no filtering is needed only adds the step of typing before choosing.

## Responsibility Boundaries

**It is not a standalone shadcn CLI component but an implementation pattern composing `Popover` and `Command`.** The shadcn registry's `combobox` assumes a different headless library that does not match the vendors this repository adopts, so it is not copied in; it serves only as a reference and is rebuilt. It is registered in the ledger as `kind: reimplemented` (`registryItem: combobox`). That is where it differs from `date-picker-client` (`kind: original`), which has no upstream.

It needs hydration and cannot be rendered directly from a Server Component. The selected value is held as a hidden input, so it goes into a native form as is.

It does not own fetching options, their order or limits on their count. It handles the array passed as `options` as is, and `Command` does the filtering against the label. When the search must happen on the server, the caller replaces `options`.

**It has no required setting.** The hidden input that carries the value is outside constraint validation, so the browser does not validate it even with `required`. Show that the field is required with `Field`, and enforce it in the Server Action or server-side validation.

### Accessibility

**The trigger does not get `role="combobox"`.** The filter input itself is exposed as `role="combobox"` inside `Command`, so putting it on the trigger too would duplicate the combobox and make the `aria-controls` associations conflict. The trigger is a button that opens the popover, and Radix reflects open / closed in `aria-expanded`.

The trigger's text changes with the selection state, so **always give it an accessible name** with `aria-label` or `aria-labelledby`. The filter input's name is passed internally as the `label` of `Command`.

Filtering is done against the label. The `value` of `CommandItem` is the value sent to the form and differs from the display text, so the label is passed as `keywords` to make it searchable. Readings are not normalized, so if kana input should find kanji options, the caller prepares a `label` that includes the reading.

## Storybook and Tests

Storybook checks nothing selected, a selection made, options that include unselectable ones, replaced text, the non-operable state, naming via an outside `Label` with `aria-labelledby`, and a controlled component shown alongside its submitted value.

The tests check that the option list is not rendered until opened, that the placeholder shows and the hidden input is empty when nothing is selected, that the trigger shows the label matching the selected value, that the trigger is exposed as a button rather than a combobox, the filter input and options when opened, filtering by label, the no-match text, that selecting updates the hidden input and closes, notification to the caller and reflection as a controlled component, that `disabled` options cannot be selected, disabling the trigger, and the automated a11y check.

cmdk and Popover use `scrollIntoView` and `ResizeObserver`, which jsdom lacks, so as with `command` the tests supply them.

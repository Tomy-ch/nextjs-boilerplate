# MultiSelectClient

## Purpose

Selects several values at once while keeping the options collapsed. The result appears on the trigger as a summary.

## Role and Public Components

| Component / type | Role |
| --- | --- |
| `MultiSelectClient` | A client island combining the trigger and the overlay of options. Values are carried as hidden inputs. |
| `MultiSelectClientOption` | The shape of one listed option. Holds the submitted value, the display text and whether it can be selected. |
| `MultiSelectClientProps` | The public props. |

## Use Cases

- Applying several categories or states at the same time when filtering a list
- Up to around 10 options, where filtering by typing is not needed

## Responsibility Boundaries

**It has no confirm action.** `onValueChange` fires the moment a checkbox is pressed. The caller decides whether to apply immediately or to hold a draft and confirm it all at once. Inside the overlay the results are hidden, so to confirm all at once on a narrow band, the caller holds the draft state.

**It owns no fetching of options, their order or limits on their count.** It lists the array passed as `options` as is, in the order given.

**It owns no selection order.** The array `onValueChange` passes is always in option order. Stacking values in the order pressed would change the order in the URL for the same combination, so the same condition would look like a different link.

**Values are carried in hidden inputs.** The overlay leaves the form through a Portal, so giving the checkboxes inside a `name` does not put them into native submission. Hidden inputs with the same name, one per selected value, are placed on the trigger side, so they are sent as **repetitions of the same name**, like `categoryCodes=1&categoryCodes=2`.

**It has no required setting.** Hidden inputs are outside constraint validation, so the browser does not validate them even with `required`. Show that the field is required with `Field`, and enforce it in the Server Action or server-side validation.

It needs hydration and cannot be rendered directly from a Server Component.

### Choosing which to use

| Situation | Component to use |
| --- | --- |
| Choose exactly one / options are static and few | `SelectNative` |
| Choose exactly one / many options filtered by typing | `ComboboxClient` |
| **Apply several at the same time** | This component |

It has no filter input, so it does not suit uses with more options than fit in the overlay.

### Naming

**Always give** either `aria-labelledby` (pointing to an outside element) or `aria-label` (passing the text directly). The overlay has `role="dialog"`, and without a name assistive technology cannot tell what it is for.

Either way, the trigger's name becomes **"item name + selection summary"**. Leaving `aria-label` as an attribute would override the button's content and drop the summary from screen reading, so internally it is always rearranged into `aria-labelledby` pointing to two things: the item name element and the trigger itself.

**It does not get `role="listbox"`.** The content is a set of checkboxes, and each checkbox exposes its selection state as `checked`. Making it a listbox would duplicate the option selection state and the checkbox state.

Just putting the item name as text directly inside the button leaves no break between the elements, and the words are read out run together. That is why it is split and rearranged into `aria-labelledby` pointing to the item name element and the trigger itself.

## Storybook and Tests

Storybook checks nothing selected, the open state, one selected, several selected, the open state with several selected, a replaced summary, naming via an outside element, the caller holding the value, disabled, and no options.

The tests check the building of the summary (nothing selected / one / several / replaced), that checkbox `checked` is reflected, that selecting and deselecting increases and decreases the submitted values, that values are sent in option order rather than the order pressed, that when controlled only the caller's value is reflected, that the name becomes "item name + summary" (via both `aria-label` and `aria-labelledby`), that unselectable options cannot be pressed, that it does not break with empty options, that it does not open when disabled, and the automated a11y check.

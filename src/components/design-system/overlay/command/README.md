# Command

## Purpose

Shows a searchable list that narrows candidates by the typed words and lets the user reach the target item with the keyboard alone. It can be placed as a surface within the screen or opened as a modal covering the screen.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Command` | The client-side root that manages the search term and the selected candidate. `label` becomes the accessible name of the search input. |
| `CommandDialog` | Places `Command` inside a `Dialog` and opens it as a modal. The caller controls opening / closing. |
| `CommandInput` | The search input that narrows the candidates. Has `role="combobox"`. |
| `CommandList` | The `role="listbox"` area that lists the narrowed candidates. Only this area scrolls once it exceeds the height limit. |
| `CommandEmpty` | An area shown only when no candidate matches. Showing and hiding happen automatically. Place it outside `CommandList`, as its sibling. |
| `CommandGroup` | Splits candidates into meaningful groups. `heading` becomes the group's label. |
| `CommandItem` | One selectable candidate. Has `role="option"` and calls `onSelect` when chosen. |
| `CommandSeparator` | A separator line drawn between groups. Hidden from assistive technology. |
| `CommandShortcut` | A supplementary display of a keyboard shortcut at the candidate's right edge. It does not subscribe to key input. |

## Use Cases

- Searching and choosing among many operations of differing hierarchy, such as lists, settings and destinations, without leaving the screen
- Placing a command palette as an auxiliary path while keeping the main navigation separate
- Building a selection UI with candidate search. For a few static choices, prefer `select-native`

## Responsibility Boundaries

In the SSR-first selection, filtering by input and keyboard operation are its essence, so it is a client island. It needs hydration and cannot be rendered directly from a Server Component. When the candidates themselves need no client runtime, pass elements assembled in a Server Component as `children`.

It owns no fetching of candidates, their order, or navigation and execution on selection. The caller handles all of them in `onSelect`. `CommandDialog` holds no open state either; the caller controls it with `open` / `onOpenChange`. When building a path that opens it with a keyboard shortcut, the key input subscription also lives on the feature side.

When searching on the server side, specify `shouldFilter={false}` and the caller takes on narrowing and ordering the candidates.

### The default filter is an order-preserving subsequence match

Characters match if they appear in the typed order, even if they are not contiguous. Readings are not normalized.

| Input | 「一覧を開く」 | Reason |
| --- | :---: | --- |
| `一覧` | Match | Contiguous match |
| `一く` | Match | Order-preserving subsequence |
| `覧開` | Match | Same as above |
| `開一` | No match | Order reversed |
| `いちらん` | No match | Readings are not normalized |
| `ICHIRAN` | No match | Same as above |

To match with kana input or romaji too, pass the reading to `keywords` of `CommandItem`. Giving `keywords={["いちらん"]}` makes `いちらん` match. When handling Japanese candidates, the caller must always decide whether to give `keywords`.

### Give the accessible name through the `label` of `Command`

**Always specify** the `label` of `Command`. Passing `aria-label` to `CommandInput` does not become the accessible name. The search input always refers to an internal hidden label through `aria-labelledby`, and that reference takes precedence over `aria-label`. Omitting `label` leaves the reference target empty, producing an input without a name. `CommandDialog` also passes `title` to the inner `Command`'s `label`, so this specification is not needed there.

The accessible name of `CommandList` is decided by `label`, and its default is 「候補」 ("candidates"). The implementation's default is English, so this component overrides it in Japanese.

### Corrections to the generated output

`CommandDialog` places `DialogHeader` **inside** `DialogContent`. Without the title inside the dialog, `aria-labelledby` does not hold and the dialog loses its accessible name.

`CommandSeparator` has a fixed `role="separator"`, but `listbox` allows only `option` and `group` as children. If the separator remained something that is read out, it would be invalid nesting under ARIA, and the automated a11y check detects it as critical. The element is kept but hidden from assistive technology with `aria-hidden`. The group headings already convey the breaks in reading order, so no information is lost.

The vendors are currently cmdk and, through `Dialog`, Radix, but the public API contains no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`.

## Storybook and Tests

Storybook checks placement as a surface within the screen, no matching candidates, the caller taking on filtering with `shouldFilter={false}`, and opening as a modal.

The tests check the association between combobox and listbox, that `label` becomes the accessible name, that `aria-label` on `CommandInput` does not, that the listbox name is Japanese, filtering by input, showing and hiding the empty message, the behavior of `shouldFilter={false}`, labeling by group headings, that `disabled` candidates are not selected, `onSelect`, moving the selection with the down key, and the automated a11y check. For `CommandDialog` they check that it is not rendered until opened, the association of title and description, that the title also becomes the name of the inner search input, toggling `showCloseButton`, closing with Escape, and the automated a11y check.

jsdom lacks `ResizeObserver` and `scrollIntoView`, used to measure candidate dimensions and follow the display position, so the tests stub them. Removing that dependency from the implementation is not the approach taken.

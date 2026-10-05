# KeyboardShortcut

## Purpose

Presents an operation that can be performed from the keyboard as a pair of "what happens" and "which keys". The key notation follows the viewing environment: `⌘` on Apple and `Ctrl` elsewhere.

## Role and Public Components

| Component | Role |
| --- | --- |
| `KeyboardShortcutList` | The `dl` that lists the pairs. The caller decides the order, the count and which operations to include. |
| `KeyboardShortcut` | One pair. Groups the description as `dt` and the keys as `dd`. |
| `KeyboardShortcutKeys` | A client island that shows only the keys. It can also be used on its own outside a list. |

`SHORTCUT_MODIFIER` / `SHORTCUT_PLATFORM` / `SHORTCUT_MODIFIER_LABEL` and `shortcutKeyLabel` are exported from `keyboard-shortcut.definition.ts`. That definition is the owner of the values a modifier key can take; callers do not write strings such as `"mod"` directly.

| Modifier key | Apple | Elsewhere |
| --- | --- | --- |
| `mod` | `⌘` | `Ctrl` |
| `alt` | `⌥` | `Alt` |
| `shift` | `⇧` | `Shift` |
| `control` | `⌃` | `Ctrl` |

`mod` stands for "the primary modifier key"; use `control` when you mean Control itself. A key not in this table is shown as the string it received. Keys such as `K` or `Enter` are not enumerated so that there is no table that keeps growing.

## Use Cases

- Listing the key operations of a screen on a help or settings screen
- Adding the keys next to an action button to show that the same operation can also be performed from the keyboard
- Indicating "which key to press" within running text

## Responsibility Boundaries

**It neither registers shortcuts nor listens for keydown.** Making the keys actually work is the caller's job. Because this component only presents guidance, preventing a listed key from not actually working is also the caller's responsibility. Operations that cannot be performed from the keyboard are not listed.

`KeyboardShortcutList` and `KeyboardShortcut` are Server Components that need no hydration. Only the choice of notation needs information about the viewing environment, so `KeyboardShortcutKeys` is split out as a client island.

**Until hydration, it renders the non-Apple notation.** In an Apple environment it switches from `Ctrl` to `⌘` after hydration. The server cannot tell the viewing environment, so one of the two has to be shown first. Rendering the majority notation and then switching was judged to cause less misreading than showing an unreadable neutral notation (such as `Mod`). Pass `platform` to fix the notation.

Letter case is not its concern. Pass `K` in lowercase and it is shown in lowercase.

**Never place keys alone.** What a key does cannot be guessed from the key, so `KeyboardShortcut` always takes the description in `children`. When `KeyboardShortcutKeys` is used on its own, the adjacent text says what the operation is.

The semantics of the key display itself belong to `Kbd`. This component composes `Kbd` / `KbdGroup` and takes on only the per-platform choice of notation.

**Key display inside a menu belongs to each menu component.** `DropdownMenuShortcut` / `MenubarShortcut` / `ContextMenuShortcut` / `CommandShortcut` give `KbdGroup` its placement and letter spacing inside a menu, and are a separate line from this component. Use them to add keys to a menu item.

They do not choose the notation, however; the caller writes symbols such as `⌘` directly. To make a menu follow the environment too, place `KeyboardShortcutKeys` directly in the item instead of `*Shortcut`, and pass the classes that give it the same look.

```tsx
<DropdownMenuItem>
  設定を開く
  <KeyboardShortcutKeys
    className="ml-auto text-xs tracking-widest text-muted-foreground"
    keys={[SHORTCUT_MODIFIER.MOD, ","]}
  />
</DropdownMenuItem>
```

It has no vendor dependency.

## Storybook and Tests

Storybook checks the default list whose notation is decided by the viewing environment, a comparison that fixes `platform` and places Apple and non-Apple side by side, the four modifier keys and keys whose notation does not change, and adding only the keys within text or next to an action. The switch of notation can only be confirmed in real rendering, so the comparison is within Storybook's scope.

The tests check the `dl` / `dt` / `dd` association, that keys come out as `kbd` elements, that keys whose notation does not change come out as given, that the modifier notation changes between Apple and non-Apple, that `platform` takes precedence over the viewing environment, the lookup of the four modifier keys, that a group of keys pressed in sequence is exposed as one `kbd`, and the automated a11y check. That the server side produces the non-Apple notation is checked with `renderToStaticMarkup`. The tests replace jsdom's `navigator.platform`.

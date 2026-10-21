# RichTextEditor

## Purpose

An editing surface for writing formatted body text. It lets the writer compose structure — headings, bulleted lists, quotes, links — in the same shape readers will see after it is saved.

## Role and Public Components

| Component / Value | Role |
| --- | --- |
| `RichTextEditor` | Client island combining the toolbar and the editing surface. Whenever the content changes, it passes the current content to the caller as an HTML string. |
| `RICH_TEXT_EDITOR_EXTENSIONS` | The full set of nodes and marks the editor reads and writes. Only what is registered here can be written. |
| `RICH_TEXT_EDITOR_HEADING_LEVELS` | The levels that can be written as headings (2 / 3 / 4). |
| `RICH_TEXT_EDITOR_MARK_ACTIONS` | Toolbar actions that change how the characters themselves look, such as bold, italic, strikethrough and code. Each also holds the key that does the same thing. |
| `RICH_TEXT_EDITOR_BLOCK_ACTIONS` | Toolbar actions that change the kind of paragraph, such as heading, bulleted list and quote. |
| `RICH_TEXT_EDITOR_COMMAND_ACTIONS` | Toolbar actions with no applied state, such as inserting a horizontal rule, undo and redo. |
| `isRichTextHrefAllowed` | Decides whether a value can be written as the `href` of an `a`. |

At the right end of the toolbar it has a **preview** toggle. While it is pressed, the formatting actions are hidden and the written content is shown in the same shape that reaches readers.

The main props are as follows.

| props | Role |
| --- | --- |
| `label` (required) | The accessible name of the editing surface. The editing surface is exposed as a `textbox` but has no visual label, so this alone conveys "what this field is for". |
| `onChange` (required) | Receives the current content as an HTML string whenever the content changes. |
| `defaultValue` | HTML string to show initially. Pass it when editing saved content. |
| `disabled` | While `true`, the editor is read-only and the toolbar actions do not work. |
| `className` | Class added to the outer frame. |

## Use Cases

- Editing body text the writer wants to structure with headings and bulleted lists, such as a description or an announcement
- Loading saved body text and editing it again with its formatting preserved

For a single-line string use [`Input`](../../form/input/README.md); for unformatted multi-line text use [`Textarea`](../../form/textarea/README.md). Choose this component only when the content to be saved itself has structure.

### How written content reaches display

Rich text takes two forms: **an HTML string for editing and saving**, and **`SanitizedRichText` for display**. This component handles only the former and is not involved in the conversion to the latter.

| Stage | Value passed | Owner |
| --- | --- | --- |
| Editing | HTML string | `RichTextEditor` (client island) |
| Saving and handoff | HTML string | The caller's form / Server Action / backend |
| Inspection | HTML string → `SanitizedRichText` | `SanitizedRichText.from` in [`model/rich-text/`](../../../../model/rich-text/README.md) |
| Display | `SanitizedRichText` | [`RichTextContent`](../rich-text-content/README.md) (Server Component) |

The preview also goes through the same path as the display side. It passes through `SanitizedRichText.from` and renders with [`RichTextContent`](../rich-text-content/README.md), so **what is not visible in the preview is not displayed after saving either**. The purpose is not to enlarge the editing surface's look as it is, but to show the shape after the allowlist.

The editing surface is only hidden, not removed from the DOM. Removing it would break the editor's internal state, and the draft would be lost on returning.

**Sanitize right before display.** Do not treat a value passed through once at save time as inspected forever after. The stored content can be rewritten through another path, and old content can remain after the allowlist is narrowed. The construction path of `SanitizedRichText` is limited to `from` to enforce this order through the type.

### Putting it in a form

This component does not participate in a `<form>`. The caller puts the value in a hidden input and submits it.

```tsx
"use client";

import { useCallback, useState } from "react";

import { RichTextEditor } from "@/components/design-system/rich-text/rich-text-editor/rich-text-editor";

export function DescriptionField({ defaultHtml = "" }: { defaultHtml?: string }) {
  const [html, setHtml] = useState(defaultHtml);
  const handleChange = useCallback((value: string) => setHtml(value), []);

  return (
    <>
      <RichTextEditor defaultValue={defaultHtml} label="説明" onChange={handleChange} />
      <input name="description" type="hidden" value={html} />
    </>
  );
}
```

For displaying the submission result compose it with [`FormFeedback`](../../../app-starter/form-feedback/README.md), and when building it as one item of a form with a field name and description, with [`Field`](../../form/field/README.md). This component itself holds no form element other than `label`.

### Editing saved content again

What goes back into editing is the saved **HTML string**. There is no need to carry `SanitizedRichText` around as a return value.

```tsx
const product = await fetchProduct(id);

<DescriptionField defaultHtml={product.description} />;
```

`defaultValue` is read only at mount. To switch to different content later, the caller changes the `key` to recreate it. Tags outside the allowlist are dropped at load time, so if old content contained tables or images, they disappear on the edit screen.

### Displaying

The display side is a Server Component. It can be placed on a different page from the edit screen.

```tsx
import { RichTextContent } from "@/components/design-system/rich-text/rich-text-content/rich-text-content";
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

export function Description({ html }: { html: string }) {
  return <RichTextContent className="typeset-docs" content={SanitizedRichText.from(html)} />;
}
```

### Handoffs that do not work

- **Passing `SanitizedRichText` to `defaultValue`** — this component accepts an HTML string. What goes back into editing is the saved string itself
- **Passing `SanitizedRichText` from a Server Component to a Client Component's props** — it is a class instance and is not serializable. Keep the value carried to the edit screen a string
- **Displaying the editor's output without inspecting it** — `SanitizedRichText` has no construction path other than `from`, so it cannot be built in the first place

### Components to Combine With

| Component | Relationship |
| --- | --- |
| [`RichTextContent`](../rich-text-content/README.md) | The display side for what was written. This component's counterpart; it renders the range of the same allowlist |
| [`model/rich-text/`](../../../../model/rich-text/README.md) | Owner of the allowlist and sanitizing. What this component can write is derived from here |
| [`typeset`](../../foundation/typeset/README.md) | The CSS foundation for typography. Both the editing surface and the display side use it, so the typography matches while writing and after display |
| [`Input`](../../form/input/README.md) / [`Textarea`](../../form/textarea/README.md) | Unformatted input. Choose these for fields that need no structure |

## Responsibility Boundaries

A client island that needs hydration because it assembles the ProseMirror editing surface in the browser. It cannot be rendered directly from a Server Component.

It does not own saving, submitting or validation. It only passes an HTML string to `onChange` whenever the content changes, and does not participate in a `<form>`. The caller puts the received string in a hidden input or passes it as an argument to a Server Action.

### What can be written is derived from the sanitizer's allowlist

The nodes and marks the editor reads and writes are decided by `RICH_TEXT_EDITOR_EXTENSIONS`, and that set is built only from what fits in the allowlist (`RICH_TEXT_TAG_NAMES`) of [`src/model/rich-text/`](../../../../model/rich-text/README.md). This keeps the relationship **tags the editor can emit ⊆ tags the sanitizer passes**. If this relationship breaks, content appears that could be written but is not displayed.

Therefore only headings (2–4), bulleted lists, numbered lists, quotes, horizontal rules, bold, italic, strikethrough, inline code, line breaks and links can be written. Tables, images, code blocks and underline cannot. When a format not in the allowlist is requested, add it to all three — the allowlist, the extension, and the test — together. Adding only the extension breaks this relationship silently.

For this reason `@tiptap/starter-kit`, which brings in many extensions at once, is not adopted. Extensions outside the requirements would make it impossible to keep the relationship above.

### Do not treat the received HTML as validated

That the HTML `onChange` passes fits in the allowlist is a property the editor's configuration satisfies. **It is not a guarantee that the string that reaches the caller satisfies that property.** It could be replaced along the way, so always pass it through `SanitizedRichText.from` when displaying. This component only narrows the entry point; `model` owns the responsibility for sanitizing.

### Links

Besides entering one from the toolbar's "リンク" (Link) action, typing or pasting a URL turns it into a link automatically. Only URLs starting with `http` / `https` / `mailto` and in-app paths with no protocol are accepted. `isRichTextHrefAllowed` decides with the same rules as the sanitizer, so an `href` the editor lets through is not dropped by sanitizing either.

With a selection, the selection becomes the link; with only a cursor, the link target itself is inserted into the body. The latter is an insertion because applying it with no selection would visibly do nothing.

To avoid creating an `a` with no link target, empty input is not applied and the reason is shown.

While editing, clicking a link does not open it. This avoids unintended navigation inside the editing surface.

### Moving within the toolbar

Within the toolbar the arrow keys move to the adjacent action, and Home / End move to either end. Only the one button that last had focus stays in the Tab order, so the whole toolbar can be passed with a single Tab. Actions that cannot be pressed are skipped.

**`role="toolbar"` promises arrow-key movement, so it claims the role only with the movement implemented.** A group of actions without that movement does not claim to be a toolbar (`SelectionToolbar` gives its name with a `fieldset` group).

### Key hints

Toolbar buttons show **the key that does the same thing** on hover / focus. `KeyboardShortcutKeys` owns the key display, and that component also takes care of choosing between `⌘` and `Ctrl`.

`KeyboardShortcut`, which pairs a description and a key as `dt` / `dd`, is not used. It assumes it is a child of a `dl`, and a tooltip has no `dl`, so it would produce orphaned `dt` / `dd`. Here it is enough for the description to sit next to the key.

**This component owns its `TooltipProvider` itself.** This keeps it working just by placing it; if the Provider were moved outside, rendering would throw the moment a caller forgot to mount it. The internal tooltips share one Provider, so moving between buttons does not insert a delay.

**The editor's extensions own the actual keys; this component does not register them.** They are a closed set of key operations that work only while the editor has focus. There is no general registration mechanism binding arbitrary actions to arbitrary keys ([0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)).

**A test pins that the hints and the actual keys do not diverge.** It fails if a declared key is not among the extension's registrations, so if an extension version changes and a key moves, the test notices first.

**Every toolbar button goes through the same hint.** Only those with a key show the key alongside; those without (horizontal rule, link, preview) show only the name. If some were left with the browser's standard `title`, the same toolbar would mix hints that appear at different speeds and look different. It never hints a key that does not work.

`aria-keyshortcuts` is not set. Whether the value would be `Control+B` or `Meta+B` depends on the running environment, and `KeyboardShortcut` already owns that decision. Holding a second decision here would itself create a state in which the display and the announcement could diverge.

### Appearance

The editing surface carries `.typeset` from [`typeset`](../../foundation/typeset/README.md). This aligns the typography while writing with the typography after `RichTextContent` renders it, under the same rules.

The toolbar buttons are obtained by composing `Toggle` and `Button`; this component has no look of its own.

The implementation uses TipTap (ProseMirror), but the vendor does not appear in the public API. All the caller passes around is an HTML string.

## Storybook and Tests

Storybook covers the empty state, the state with saved content loaded, the read-only state, and the case where tags outside the allowlist are passed as the initial value. Each story lists the HTML passed to the caller, so the correspondence between actions and output can actually be checked.

The tests cover rendering the toolbar and a named editing surface, moving within the toolbar with the arrow keys and Home / End while skipping actions that cannot be pressed, that only one button stays in the Tab order, loading the initial value and dropping tags outside the allowlist, that editing is impossible when read-only, that every formatting button toggles its pressed state, that changing the paragraph kind notifies the changed HTML, that undo and redo can be pressed only while they can run, link entry, applying it with and without a selection, applying it with Enter, showing the reason when rejecting a protocol outside the allowlist or empty input, removing it, **that the hinted keys match the extensions' registrations**, and the automated a11y check.

**The relationship with the allowlist is pinned by tests.** They check that the list of nodes and marks the editor reads and writes matches the derived set, that the tags the editor can emit fit in `RICH_TEXT_TAG_NAMES`, that the editor's output keeps its elements and attributes after sanitizing, and that the editor itself does not output a protocol outside the allowlist. Adding an extension makes these four fail.

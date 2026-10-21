# RichTextContent

## Purpose

Displays text that its writer gave structure to, such as a description or an article body, as body text for readers.

## Role and Public Components

| Component | Role |
| --- | --- |
| `RichTextContent` | Renders sanitized rich text as React elements and applies the `typeset` typography. |

| props | Type | Role |
| --- | --- | --- |
| `content` | `SanitizedRichText` | The content to display. Required. |
| `className` | `string` | Class layered onto the outer frame. Typography presets such as `typeset-docs` are passed here. |
| Others | native `div` attributes | `lang` / `dir` / `id` and the like are passed through to the outer frame. |

It does not accept `children` or `dangerouslySetInnerHTML`. Only `content` determines the body.
The RDFa `content` attribute of a native `div` cannot be specified either, because the body prop occupies the name.

## Usage

### Minimal call

`content` is a `SanitizedRichText`, not an HTML string. The only construction path is `SanitizedRichText.from`,
and a value that has not passed through this step does not exist as the type.

```tsx
import { RichTextContent } from "@/components/design-system/rich-text/rich-text-content/rich-text-content";
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

export function Body({ html }: { html: string }) {
  return <RichTextContent content={SanitizedRichText.from(html)} />;
}
```

### From editing to display

The writing side is [`RichTextEditor`](../rich-text-editor/README.md), and the displaying side is this component.
The editor returns an HTML string whenever the content changes, and the saved string is passed through `SanitizedRichText.from`
every time it is displayed.

```tsx
// 書く側（client island）。受け取った文字列は hidden input などで保存側へ渡す
<RichTextEditor label="説明" onChange={setHtml} />;

// 表示する側（Server Component）。保存済みの文字列をそのつど検査する
<RichTextContent content={SanitizedRichText.from(saved)} />;
```

**The string the editor returned is not treated as validated.** That the tags the editor can emit stay within the allowlist
is a property the editor's configuration satisfies, not a property of the string that comes back after
being saved. Always pass it through `SanitizedRichText.from` right before display.

### Layering a typography preset

This component goes as far as adding `.typeset` and adds no preset. To change the letter spacing, pass a preset class
published by [`typeset`](../../foundation/typeset/README.md) in `className`.

```tsx
<RichTextContent className="typeset-docs" content={content} />
```

### Giving it document semantics

It renders a single `div` and carries no `article` or `section` semantics. The caller indicates what kind of document
the body is with an outer element.

```tsx
<article aria-labelledby="body-heading">
  <h2 id="body-heading">説明</h2>
  <RichTextContent content={content} />
</article>
```

### Placing it inside a Client Component

`SanitizedRichText` is a class instance and is not serializable, so it cannot be passed to a Client Component's props.
To place the body inside a Client Component, render it on the Server Component side and pass the result
as `children`.

```tsx
// Server Component
<ClientPanel>
  <RichTextContent content={SanitizedRichText.from(html)} />
</ClientPanel>
```

## Components to Combine With

| Component | Relationship |
| --- | --- |
| [`model/rich-text`](../../../../model/rich-text/README.md) | Owner of the `content` type and the allowlist. It decides what passes and what is dropped. |
| [`rich-text-editor`](../rich-text-editor/README.md) | The writing-side counterpart. The HTML string it outputs becomes this component's input after being saved. |
| [`foundation/typeset`](../../foundation/typeset/README.md) | The typography itself. The CSS foundation that publishes `.typeset` and the preset classes. |
| [`view-state/feedback-state`](../../../app-starter/feedback-state/README.md) | Display for the state where there is no body or fetching failed. This component only renders an empty frame. |

## Use Cases

- Displaying a description entered on an edit screen as the body of a viewing screen
- Putting HTML received from the backend into the body, narrowed to what may be displayed

## Responsibility Boundaries

In the SSR-first selection it is rated `◎`. It is a Server Component with no state, browser API or event handler,
and needs no hydration. It can be used from both Server Components and Client Components, but `content` cannot be
passed as a Client Component's props.

It does not own sanitizing. `model/rich-text` owns both the allowlist definition and the processing that inspects an
HTML string and turns it into a tree; this component only renders the tree it receives. It also does not own fetching,
saving or editing; the caller decides where `content` comes from.

Rendering builds React elements directly from the tree, so there is no step that turns it back into an HTML string. `dangerouslySetInnerHTML`
is used neither as a prop nor in the implementation.

The heading hierarchy is also rendered as `content` holds it. The allowlist drops `h1`, so the body's headings
start at `h2` and do not compete with the page's `h1`.

Links in the body are rendered as native `a`. Even an internal link causes a full-page navigation, not a
client-side navigation.

When the body is empty it renders an empty frame. It has no display conveying "there is no body"; the caller indicates
that with `FeedbackState` or similar.

## Storybook and Tests

Storybook places it at `Rich Text/RichTextContent` and covers every block and inline type the allowlist passes,
the state with the `typeset-docs` preset layered on, and the empty-body state.

The tests cover that each tree element renders as the corresponding DOM element, that the heading hierarchy and the links' `href` are
preserved, that `.typeset` is added, that `.typeset` remains when `className` is layered on, the empty-body case, the
propagation of native `div` attributes, and the automated a11y check.

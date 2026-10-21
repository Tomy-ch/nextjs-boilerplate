# Typeset

## Purpose

Shows sanitized Markdown / HTML with a consistent typesetting rhythm.

## Role and Public Classes

| Class | Role |
| --- | --- |
| `.typeset` | The starting point that applies a common typesetting rhythm to HTML elements. |
| `.typeset-<preset>` | A preset that overrides font, size, leading and flow per context. |
| `.not-typeset` / `[data-not-typeset]` | An escape hatch that excludes its descendants from Typeset. |
| `.typeset-scroll` | A wrapper that makes content that does not fit horizontally, such as a table, horizontally scrollable. |

`typeset.css` is the CSS foundation that defines these, and the Story is placed at `Foundation/Typeset`.

## Use Cases

Apply it outside the renderer wherever the typesetting of HTML elements should be shared, such as articles, documentation and streaming display.

## Responsibility Boundaries

It holds no renderer, sanitizer, maximum width or business content. The caller owns safe HTML and layout.

## Storybook and Tests

Storybook checks headings, paragraphs, tables and presets. As a CSS foundation, visual verification is done in Storybook.

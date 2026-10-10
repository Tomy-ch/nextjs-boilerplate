# Print

## Purpose

The CSS foundation that sets the layout of output to paper and its substitute (saving as PDF). It exports no React component.

The extension points (the `print:` variant / `@media print`) are set by ADR [0051](../../../../../docs/adr/0051-styling-system.md), and this foundation is their minimal implementation.

## What It Holds

| Target | Content |
| --- | --- |
| Page | Margins that allow for binding (`@page { margin: 16mm }`) |
| Headings | Kept on the same page as the body that follows (`break-after: avoid`) |
| Paragraphs | A single line does not spill onto the next page (`orphans` / `widows` set to 3) |
| Tables | The header row repeats at the top of each page, and rows are not split |
| Figures | Not split |

## Usage

The caller specifies whether something goes on paper.

```tsx
<nav className="print-hidden">…</nav>
<p className="print-only">出力日: 2026-08-04</p>
<div className="print-color-keep bg-primary" style={{ width: "62%" }} />
```

| utility | Behavior |
| --- | --- |
| `print-hidden` | Shown on screen, not on paper |
| `print-only` | Not shown on screen, only on paper |
| `print-color-keep` | Keeps the surface color on paper too |

`print-hidden` is not decided automatically by tag because **what is an action and what is content differs from screen to screen**. A `nav` may contain information you want printed, and a `div` may be a block of actions.

`print-only` is for supplementing on paper the information that on screen could be followed through a link or an action. The destination URL, the output date and time, and the source of the page are examples.

Apply `print-color-keep` **only to surfaces where the color itself carries information**. Browsers omit background graphics from the page by default, so surfaces whose color is merely decorative read better without it (and the omission saves ink). The bars of a bar chart, or marks that show a state by color, leave only blank space when omitted, so they qualify. Text and borders stay on paper by default, so applying it to elements without color is pointless.

## Responsibility Boundaries

It does not own what to print. The structure of the screen, the business content and running the print (`window.print()`) are all outside it.

Building a PDF on the server is the backend's responsibility (ADR [0070](../../../../../docs/adr/0070-backend-role-separation.md)). What this covers stops at producing printable HTML and CSS; everything beyond that is cut off as a boundary.

## Color Scheme

**Printing always uses the default (light) color scheme, regardless of the screen's color scheme.** This is not the print side overriding colors; themes other than the default are limited to `screen` (owned by the token generation side).

Printing with a dark color scheme fills the whole page black when backgrounds are printed, and leaves faint text on white paper when they are not. Neither is readable, so printing falls back to the default color scheme.

## Storybook

It checks elements that are not printed and elements that appear only in print, tables that span pages, and the splitting of headings and paragraphs. The difference is not visible on screen, so each story has a button that opens the print preview (the button itself is `print-hidden`, so it does not appear on paper).

Running the print is not this foundation's responsibility, so the button exists only on the story side.

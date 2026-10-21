# TextHighlight

## Purpose

Shows where a searched term matched in the body text, making it easier to find the target item in a list.

## Role and Public Components

| Component | Role |
| --- | --- |
| `TextHighlight` | Shows the body text with the spans matching the given terms emphasized by a native `mark`. |

The props are `text` (the body text to highlight), `query` (the terms to highlight; a string or an array of strings), `caseSensitive` (whether to distinguish case; by default it does not), and native `span` attributes. It does not accept `children`.

## Use Cases

- Showing, in a list of search results, where the entered term matched in the item name or description
- Making the terms used as filter conditions stand out in the matching body text

It does not present the match count or the search conditions themselves. Highlighting stays a visual cue, so the feature states the count and conditions in separate text.

## Responsibility Boundaries

In the SSR-first selection it is `◎`. It is a Server Component with no state, browser APIs or event handlers, and needs no hydration. It can be used from both Server Components and Client Components.

It owns neither splitting the search terms, normalization, synonym expansion, nor counting matches. The caller decides which terms to pass to `query`. It takes no business types or API vocabulary either; it handles only the body string and the terms.

`text` is treated only as a string and never interpreted as HTML. This component is not an entry point for raw HTML. To typeset sanitized Markdown / HTML, use `Typeset`.

Even if a term contains regular expression symbols, they are treated as literal characters. An empty string and an empty array mean "do not highlight" and show the body as is.

`mark` is the element for "a span worth attention in the current context", which differs in meaning from `strong` and `em`, which express the importance of the words themselves. Highlighting does not change what the body reads out.

The surface is rendered with `accent` / `accent-foreground`, and the body text color and letter spacing are inherited from the outer `span`. The caller specifies the look of the whole body with `className`.

## Storybook and Tests

Storybook checks a basic match, matches in several places, `caseSensitive`, multiple terms, terms containing regular expression symbols, no match, an empty term, and the caller specifying the look of the body.

The tests check that matched spans become `mark`, that highlighting neither drops nor duplicates any of the body string, matches at the start and the end, the case default and `caseSensitive`, multiple terms, handling of regular expression symbols, that the body is shown as is for an empty string, an empty array and no match, propagation of native `span` attributes, and the automated a11y check.

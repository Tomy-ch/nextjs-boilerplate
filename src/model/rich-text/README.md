# rich-text

A sanitize port that converts an unchecked HTML string into a tree narrowed to only what may be displayed.

By narrowing the construction path for values the display side can receive to `SanitizedRichText.from()` alone, the type guarantees that HTML that has not gone through sanitize can never reach the UI.

## Public API

- `SanitizedRichText` / `SanitizedRichText.from()` — A Value Object that parses and sanitizes an HTML string. `root` holds the checked hast root node
- `RICH_TEXT_SANITIZE_SCHEMA` — The sanitize schema derived from the allowlist
- `RICH_TEXT_TAG_NAMES` / `RICH_TEXT_BLOCK_TAG_NAMES` / `RICH_TEXT_INLINE_TAG_NAMES` — The sets of tags let through
- `RICH_TEXT_LINK_PROTOCOLS` — The protocols let through in `href`
- `RICH_TEXT_STRIPPED_TAG_NAMES` — Tags removed together with their content
- `toRichTextRoot()` — Normalization that aligns a hast node to a root node

## allowlist

| Category | Let through |
| --- | --- |
| Block | `p` `h2` `h3` `h4` `ul` `ol` `li` `blockquote` `hr` |
| Inline | `strong` `em` `s` `code` `a` `br` |
| Attributes | Only `href` of `a` |
| `href` protocols | `http` `https` `mailto` |

`h1` is not let through because a heading in the body would compete with the page's `h1`. `li` remains only when it is inside `ul` / `ol`.

Tags outside the allowlist are unwrapped, keeping their contents. Only `script` / `style`, whose text children would mix straight into the body, are removed together with their content via `RICH_TEXT_STRIPPED_TAG_NAMES`.

Relative URLs (`/path` `#anchor` `?query`) remain in `href`. That protocols are checked against absolute URLs is the sanitize side's specification.

## Usage Examples

```ts
import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

const content = SanitizedRichText.from(rawHtml);
```

The constructed value is passed to `RichTextContent` to be rendered. `root` is a hast object and has no path back to an HTML string.

## Implementation Notes

Parsing is done to spec by `hast-util-from-html` (internally `parse5`), and checking is done on the tree by `hast-util-sanitize`. Unlike sanitizing that rewrites strings with regular expressions, no difference in parser interpretation is introduced between before and after the check.

`RICH_TEXT_SANITIZE_SCHEMA` states every item of the schema explicitly. `hast-util-sanitize` fills unspecified items from its default schema, so without stating them, the range let through would silently widen when the upstream default widens.

## Replacing the Implementation

The sanitize implementation is confined to the two packages `hast-util-from-html` / `hast-util-sanitize`. **What this port guarantees is "checking against a tree", not which implementation does it.** hast and unist are public specifications, so replacing the implementation does not change the contract of `SanitizedRichText`.

The migration target is `sanitize-html` + `html-react-parser`. The allowlist would have to be rewritten into the library's own format, but the design that hands values to React elements without going through an HTML string can be built as is.

There is one condition for considering a replacement. **When an advisory of `high` or above is issued against either of the current two packages and upstream does not respond.** In that case, follow the response deadline in ADR [0004](../../../docs/adr/0004-library-management.md). Upstream having stopped updating is not itself a condition. This port checks the tree after a spec-compliant parse, so maturing and no longer changing is not degradation.

There is no going back to an implementation that uses `dangerouslySetInnerHTML` (the prohibition in [`docs/rules.md`](../../../docs/rules.md) and biome's `noDangerouslySetInnerHtml`). With a sanitizer that goes through strings, the difference in interpretation between the sanitizer and the browser is itself the attack surface.

## Boundaries

- Holds no business rules owned by the backend
- Does not reference fetch or config
- Does not render. Conversion to React elements is done by `RichTextContent` in `components`
- Does not output HTML strings

## Widening the allowlist

The allowlist, the editor's set of extensions, and the tests are one set. To keep "tags the editor can produce ⊆ tags the sanitizer lets through", never change only one of them.

## Constraints

`SanitizedRichText` is a class instance and not serializable, so it cannot be passed directly to a Client Component's props. Extracting `root` makes it passable, but at that point the type guarantee of "already sanitized" is lost.

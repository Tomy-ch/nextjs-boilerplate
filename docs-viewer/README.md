---
test-requirement: [unit, component]
coverage-exclusions:
  - "docs-viewer/src/main.tsx"
---

# docs-viewer

The viewer for the documentation portal. It is a **separate package** from the application: it does not run
on the Next.js runtime, but is built on its own as a static site and deployed to GitHub Pages
([ADR 0141](../docs/adr/0141-portal-operations.md)).

The `docs.json` it loads is a generated artifact, assembled by `scripts/portal/` with
`docs/portal/manifest.yaml` as the single source. The viewer owns no source of content; it only renders the
generated artifact. The build entry point is the root `pnpm portal:build`, which runs generation and the
viewer build (`pnpm --filter docs-viewer build`) in sequence.

## Why a separate package

**Because the tolerance for sanitization differs.** The application handles content that users post, and
the allowlist of [`model/rich-text`](../src/model/rich-text/README.md) lets through neither `table`, nor
`pre`, nor the `class` attribute. That is by design.

This viewer, on the other hand, renders committed documents the repository itself holds. Without tables,
code blocks and diagrams it is useless. Placing a wide allowlist and a narrow one side by side in the same
repo would leave **only a convention to stop the application from importing the wide one**. Splitting the
package makes the wide allowlist unreachable from the application. The structure exists so that the
separation is guaranteed by the package boundary.

Dependencies are not shared either. The application's `package.json` and this package's `package.json` are
separate, and dependencies the viewer pulls in never land on the application's supply surface. The boundary
is declared by listing both under `packages` in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml).
The converse also holds — this package's runtime dependencies (and their transitive dependencies) **run in
the browser on the published site**, so their vulnerabilities are treated with the same weight as the
application's runtime dependencies. Pinning transitive dependency versions is owned by `overrides` in the
same file.

## The path to rendering the body

A document reaches the screen through the following path. Each stage is confined to one directory, and no
path skips a stage.

```text
Markdown string
  → HTML string          (markdown/    marked)
  → hast tree            (sanitize/    parsed as a fragment)
  → sanitized tree       (sanitize/    filtered by the allowlist → Value Object)
  → React elements       (document-content/  built directly from the tree, never through an HTML string)
  → diagram              (mermaid-diagram/   replaces only the single `pre` element)
```

- **Sanitization always runs.** The Markdown served is assembled mechanically from the repository's
  documents, but when that premise breaks, the rendering side is the last line of defense.
- **Being sanitized is carried in the type.** A Value Object whose only construction path is
  `SanitizedDocument.from` makes it impossible for unsanitized HTML to circulate as this type. The display
  components accept only this type and drop `children` and `dangerouslySetInnerHTML` from their props.
  It has the same shape as the application's `RichTextContent` but accepts a different type, and the point
  is that **the two cannot be mixed**.
- **The tree is inspected, not strings.** The allowlist is applied after a spec-compliant parser builds the
  tree, so there are none of the parser interpretation differences that string-replacement sanitization
  suffers. Rendering also builds React elements directly from the tree and never goes back to an HTML string.
- **The rendering side decides by the shape of the tree alone.** Whether something becomes a diagram is
  decided by the shape `pre > code.language-mermaid`, and the rendering side never parses strings again.
  Re-parsing would give the sanitized tree and the rendering decision different grounds. Replacement is
  confined to the single `pre` element via `components` of `hast-util-to-jsx-runtime`, and the decision
  receives the original node through `passNode`.
- hast's `className` is an array in the types, but the parser may keep it as a string, so **it is accepted
  by the shape of the value**.

### How the sanitization schema is decided

The schema is owned by `sanitize/document.definition.ts` and **does not leave this package**. It is decided
as follows.

- **No item is left to `hast-util-sanitize`'s default schema.** Unspecified items are filled in with defaults
  by specification, so this prevents the allowed range from silently widening when the upstream defaults
  widen. Every item is explicit, including `allowComments` / `allowDoctypes` / `clobber` / `clobberPrefix`.
- **`h1` is allowed.** The surface's title holds the manifest item name, not the document's title, so it
  does not compete with the body's `h1`. Dropping it would remove only the tag, floating the title text to
  the top of the body.
- **`class` is allowed in a restricted shape.** Only the code block language notation (`language-*`). A
  class attribute can carry any string by itself, so without restricting the shape, the body could specify
  class names that carry styles.
- **Protocol-relative URLs (`//host`) are dropped after sanitization.** `hast-util-sanitize`'s protocol
  check looks only at the scheme of values containing `:`, so `//host` passes through as a relative
  reference. It is in fact an absolute URL to an external host, and left in an `img` it would send requests
  from the published site to the external host.
- **An `img` without `alt` gets an empty string** (`required`). This keeps content from dropping out of
  screen reading and lets it be skipped as decoration.
- **Ancestor constraints (`ancestors`) only prevent structural disorder; they are not a security boundary.**
  The check walks the tree before transformation, so it cannot rescue children whose ancestor was itself
  dropped (`tr > td` without `table` loses only `tr`, leaving `td` orphaned). There is no post-processing.
- `script` / `style` are removed along with their content, and the protocols of `href` / `src` are limited
  to `http` / `https` / `mailto`.

### Rendering diagrams

- **mermaid is dynamically imported only when a diagram appears.** mermaid is large, and most documents
  have no diagram, so a static import would make the initial display that much heavier.
- **The output SVG is not sanitized.** There is no need to. Sanitization exists to "filter the fetched
  Markdown", and what is passed to the diagram is the string of a code block that already passed that
  filter. The diagram is assembled locally from that string, and HTML from outside appears nowhere.
  `securityLevel` is `strict`.
- **The color scheme follows the surface.** The portal has no color-scheme switch and follows the OS
  setting, so it looks at `prefers-color-scheme` to choose `dark` / `default`.
- **When a diagram cannot be rendered, the source is left as is.** Diagram syntax is validated in CI by
  `scripts/mermaid-lint`, so broken diagrams do not arrive, but if one does, it is better left readable
  than showing nothing. The container indicates its state with `data-state` (`source` / `rendered`).
- **mermaid requires a browser.** It determines the diagram's actual size from text measurement, so it
  cannot render in an environment that imitates the DOM (`mermaid.parse` passes but `mermaid.render`
  fails). Tests mock `mermaid` and check only that it was handed the container and asked to render, and the
  state transitions.

## View state and routing

- **Only the location hash can be restored across sharing, history and back navigation.** The site is
  served statically, so the route cannot be asked of a server ([0141](../docs/adr/0141-portal-operations.md)).
  The hash is `#/<group>/<section>`; input that cannot be interpreted is treated as "unspecified" and does
  not fall to an empty view.
- **The hash carries only "which document is being viewed".** The search term and display language are
  temporary filters and are not put in the hash. The search box is a client island for input usability;
  a static site has no server to carry the search term to, so results are also rendered as local state.
- **The requested group is re-chosen from the displayable groups.** It may have disappeared after language
  filtering, so if it is absent the first group is used, and if there are no candidates an empty notice is
  shown.
- **A hash pointing at a section scrolls to that heading.** Switching the group alone cannot reach a section
  at the end of a long group, and what the link pointed at and what is shown would diverge.
- **Documents open in a surface (Dialog).** The surface has no trigger; it is opened only from the card
  side, and only close requests come from the surface. Right after opening, only the title is settled and
  the body is rendered as loading; if the fetch fails, the surface does not stay open.
- **The search corpus is built from the groups after language filtering.** If items not shown could be
  found by search, their results could not be opened. Subgroup items are flattened in too — if items placed
  only in a subgroup were missing from search, users would see them as "existing but unfindable". The
  names of the owning section / group are folded into each item so that a search result alone shows where
  the item belongs.

### Filtering by display language

- The item language (`en` / `ja` / `all`) and the display language the user picks (`EN` / `JA`) are
  **separate axes**. `all` is for items without a translation pair (generated HTML or external links); they
  are outside the language filter and always stay at the top.
- **Language is decided per section and shared with the subgroups under it.** A section with no JA item at
  all falls back to EN even when JA is selected, preventing languages from mixing across subgroups within
  the same section.
- A section is kept if content remains in either items or subgroups; sections and groups left empty are
  dropped.

## Choosing interactive elements

- **The interactive element changes with the card's destination.** Markdown opens a surface within this
  page, so it is a `button`; everything else (generated HTML / external tools) navigates to another
  document, so it is an `a` (new tab, `rel="noopener noreferrer"`). Unifying on one to match the look would
  stop keyboards and assistive technology from conveying "what happens when pressed".
- **Making the whole card surface the hit area is done by extending a pseudo-element.** `Card` has no
  `asChild` and renders a `div`, so the card itself cannot be a `button` or `a`. The interactive element is
  placed in the title, and `after:absolute after:inset-0` extends only the hit area. The role is held by a
  real `button` / `a`, so it reaches assistive technology correctly, and the focus indicator is handled by
  `focus-within` on the card.
- **No link is placed in an Accordion (native `details`) heading.** `summary` is itself an interactive
  element, and a link inside it nests interactive elements and breaks the keyboard reach order (axe's
  `nested-interactive`). Navigation is handled by the section links, which point at both group and section,
  so selecting a section also switches the group.
- Native `details` has no control for keeping only one item open at a time, but for comparing documents
  being able to open several is more convenient, so no client island is added to make them exclusive.

## Startup and how failures are shown

- The generated artifact `./docs.json` is **fetched by relative path**, validated against the schema, then
  mounted. A shape mismatch is a deployment accident, not a user input error, so no recovery is attempted;
  it throws.
- **The cause of failure is shown on screen.** Served statically, the site has nowhere to send logs, and
  unless the person looking at the broken screen can trace the cause from it directly, the failure reaches
  no one. A fetch failure (the response status), broken JSON, and a wrong shape (which item) are all
  included in the text.

## Test Responsibilities

The frontmatter lists two, `test-requirement: [unit, component]`, because this tree carries both
([0090](../docs/adr/0090-testing-strategy.md)). Document parsing, formatting, search and routing are
verified as pure logic; components that render are verified with React Testing Library. Which one applies
is decided by whether the subject returns rendered output.

The tests run in the root vitest suite ([`vitest.config.ts`](../vitest.config.ts)) and are subject to the
same coverage gate as the application. A separate suite would make it possible for only one side to be green.
Modules excluded from coverage are recorded in the frontmatter's `coverage-exclusions`
([0090](../docs/adr/0090-testing-strategy.md)).

Recurring patterns in this tree:

- The root environment is `node`, so tests of rendering components switch with
  `// @vitest-environment jsdom` at the top of the file.
- `fetch` is answered by MSW (`setupServer`, `onUnhandledRequest: "error"`). Tests that capture the
  loading state leave the response unreturned with `delay("infinite")` — returning it can put the body in
  place by the time the surface appears, making capture depend on fetch speed. A situation where a
  non-`Error` value is thrown cannot be produced by an HTTP response, so only there is `fetch` replaced
  directly.
- `scrollIntoView`, which jsdom does not implement, is replaced on `Element.prototype`, and only the fact
  that it was called is checked.
- The search box that follows keystrokes advances its waiting time with fake timers
  (`shouldAdvanceTime: true`).
- A Dialog is rendered by a Portal directly under `body`, so axe for the opened state runs against
  `baseElement`, not `container`. The rules disabled in axe are decided by
  [0091](../docs/adr/0091-test-verification-methods.md).
- When a startup function does not return its root, `createRoot` is replaced to capture what it creates,
  and the test cleans it up ([`docs/testing-conventions.md`](../docs/testing-conventions.md)).

## Relationship to the Design System

The UI is built from the components of [`src/components/design-system`](../src/components/README.md).
**It references the application's source directly through the `@` alias rather than copying it.** Copying
would, the moment the two drifted, defeat the purpose of verifying the design system on a screen in real use.

This viewer is a real user of the design system, with the role of applying loads that never appear inside
Storybook alone (real data volume, real document length, real combinations).

Three pieces of wiring make the direct reference work.

- The alias `@` → `../src` in [`vite.config.ts`](vite.config.ts). The `@/` that design-system components
  use internally also resolves through this alias.
- [`src/styles.css`](src/styles.css) `@import`s the application's `globals.css` as is. Duplicating the
  token, typesetting and foundation CSS would defeat the purpose for the same reason.
- Tailwind's class detection traces from that CSS's location, so components in another package
  (`../../src/components`) and the viewer's own source are stated explicitly with `@source`.

Body typesetting is owned by the design system's `typeset` foundation, and the documentation preset
(`typeset-docs`) is applied by default.

## Structure

| Directory | Role |
| --- | --- |
| `src/docs-json/` | Schema and reading of the generated `docs.json`. A shape mismatch throws as a deployment accident |
| `src/lang-filter/` | Filtering by display language. A section without JA content falls back to EN so that languages do not mix within a section |
| `src/search/` | Building the search corpus. Folds the owning section / group names into each item |
| `src/hash-route/` | Parsing and building the location hash `#/<group>/<section>` |
| `src/markdown/` | Converting Markdown to an HTML string. The output always goes to sanitize |
| `src/sanitize/` | The documentation allowlist, and the Value Object that represents being sanitized |
| `src/document-content/` | Renders the sanitized tree as React elements. Holds only the `pre` replacement |
| `src/mermaid-diagram/` | Extracting mermaid source from the tree's shape, and the component that renders the source as a diagram |
| `src/portal-app/` | The viewer itself. Holds the view state (hash, language, search term, open document) |
| `src/portal-sidebar/` | Navigation to groups and sections, and permanent links to generated HTML / external tools |
| `src/portal-card-grid/` | Lays items out as cards. Chooses `button` / `a` by destination |
| `src/mount/` | Fetching, validating and mounting the generated artifact, and how failures are shown |
| `src/main.tsx` | The entry. Only finds `#root` and passes it to `mount/` |

`vite.config.ts` uses `base: "./"` so that it holds no deployment path prefix and works wherever on the site
it is placed. Fetching the generated artifact (`./docs.json`) is relative too. This keeps the portal URL
something the deploying side can decide.

## Operations

- **Lean dependencies toward components that are self-contained as far as possible.** This viewer is meant
  to stay portable to a separate repository as is, and every dependency pulled in becomes porting cost.
  For components that come in `-native` / `-client` pairs, prefer `-native` as far as requirements allow
  (display language switching is `ToggleGroupNative`; the search box has to follow keystrokes, so it is
  `SearchFieldClient`)
- Routing, filtering, search and reading the generated artifact (`docs-json` / `lang-filter` / `search` /
  `hash-route`) depend on nothing but zod. Markdown conversion and sanitization (`markdown` / `sanitize`)
  are confined to marked and the hast toolset. This keeps them ready to take along as is when exported
- Next.js-specific APIs (`next/link` / `next/image` / Server Components) are not used

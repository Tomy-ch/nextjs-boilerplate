---
test-requirement: unit
coverage-exclusions:
  - ".storybook/css.d.ts"
  - ".storybook/lib/sample-asset.ts"
  - ".storybook/main.ts"
  - ".storybook/manager.ts"
  - ".storybook/msw/handlers.ts"
  - ".storybook/msw/worker.ts"
  - ".storybook/preview.tsx"
---

# .storybook

Home of the component catalog (Storybook) configuration and of the checks the catalog itself owns
([0054](../docs/adr/0054-ui-catalog-storybook.md)). Stories themselves sit next to their component, not
here. The exception is **an inventory whose subject is not a particular component but the whole of a
public surface or an SSOT**: the design token inventory
[`design-token.stories.tsx`](design-token.stories.tsx) and the icon inventory
[`icon.stories.tsx`](icon.stories.tsx) live here (the placement rationale is in
[`src/components/README.md`](../src/components/README.md)).

## Structure

| Path | Role |
| --- | --- |
| `main.ts` | Which stories are loaded, addons, and the assets served. Copies the interception service worker out of the dependency. Turns off outbound usage reporting |
| `preview.tsx` | Color scheme and surface switching, mounting the cross-cutting Providers, the Server Action replacement declarations, starting interception, catching per-story exceptions, resetting mocks |
| `preview.css` | Moves only the surface that renders a story onto this repository's color tokens |
| `manager.ts` | The look of the catalog's outer frame |
| `css.d.ts` | Type declaration for side-effect imports of global CSS |
| `msw/` | The `/api/*` the catalog answers by itself (not generated from the contract; why it lives apart is in [`mocks/README.md`](../mocks/README.md)) |
| [`lib/`](lib/) | The catalog's own modules — computations for display, exception catching, deciding what to intercept, the spelling of served assets |
| [`public/`](public/README.md) | Assets served to the catalog only. Why it is separate from the app's `public/`, and the rules for adding to it, are in that README |
| `*.stories.tsx` | Inventory stories. `stories` in `main.ts` picks up `./*.stories.*` |

`lib/` is also read by the stories placed next to components and by the fixtures those stories read. The
path is `~catalog/*`; it is declared in `paths` of [`tsconfig.json`](../tsconfig.json), with a copy in
[`vitest.config.ts`](../vitest.config.ts). **Do not make it an alias starting with `@`.** `@x/y` has the
same shape as an npm scope, so biome's `noUndeclaredDependencies` rejects it as an undeclared dependency.

## Decisions the Configuration Holds

The configuration files cannot be run on their own (see Test Responsibilities
below), so the decisions placed in them are written here.

### `main.ts`

- **Outbound usage reporting and update checks are turned off** (`core.disableTelemetry` / `disableWhatsNewNotifications`).
  The catalog build is the most frequently run target in CI (vrt / a11y / storybook-build / docs
  deployment), and with the defaults it would reach outward every time. The sender would not be this
  repository's user but the CI of whoever received it as a template, and neither the values sent nor the
  destination are something the side that created it from the template chose
  ([0010](../docs/adr/0010-standards-and-non-lockin.md), which keeps outbound sending off by default)
- **The interception service worker is copied from the dependency into `public/` when the configuration is
  loaded.** Why the start command does not do it is in [0054](../docs/adr/0054-ui-catalog-storybook.md).
  The copied file is not tracked ([`public/README.md`](public/README.md))
- Serving lists the app's `public/` and the catalog's `public/` side by side in `staticDirs`. **Both are
  visible from the serving root**, so when names collide, which one is served depends on the serving order

### `preview.tsx`

- **Font variables are attached as classes at the same place as the real app's `<html>`
  (`document.documentElement`).** `next/font` carries variables on a class, so without this the catalog
  alone renders in the bare font and the baseline images do not match the real thing. The real app loads
  different fonts per surface, but the catalog lays surfaces side by side in one document, so **it serves
  the fonts of every surface together**
- **Color scheme goes on `data-theme` of `:root`, surface goes on `data-surface` of `body`.** The switching
  axes and where the attributes sit are owned by [`tokens/README.md`](../tokens/README.md) (the surface must
  be on the `body` equivalent so that Portal content does not fall outside the attribute). **To return to
  the default, remove the attribute** — "follow the OS setting" is exactly the state with `data-theme`
  removed, and the default surface is expressed on the `:root` side, so rather than writing the default
  value as an attribute, the absence is created
- **The cross-cutting Providers are placed not per story but as a decorator shared by every story, at the
  same position where the real app mounts them in the layout shell**
  ([0026](../docs/adr/0026-layout-shell-mount.md)). If each story wrapped itself, a story that forgot to
  wrap would render Storybook's error screen instead of the component, and that could be approved as a
  baseline image
- **Story exceptions are caught by `lib/story-error-boundary`** (the decision is in that component's doc).
  The decorator gives the story's `id` as `key` and rebuilds on every story change. Carrying it over would
  make even a fixed story look broken. The boundary's screen does not reach `pageerror`, so capture and
  a11y fail on `data-story-error`
  ([`vrt/README.md`](../vrt/README.md#a-broken-story-does-not-pass-as-unchanged))
- **`beforeEach` resets every mock** (`resetAllMocks`). Replaced mocks are shared per module, and a docs
  page renders the stories of the same page at once, so without a reset the neighboring story shows the
  return value of another story. Even an implementation given through `fn(impl)` is reset, so the
  replacement's default response comes back
- **Same-origin `/api/*` is intercepted by `loaders` shared by every story before rendering.** Stories do
  not replace `fetch` themselves ([0054](../docs/adr/0054-ui-catalog-storybook.md))
- **`parameters.nextjs.appDirectory` is `true`.** This repository uses the App Router only, and navigation
  hooks such as `useRouter` throw without the App Router context
- `parameters.a11y.test` is `error`. The panel is for local checking; pass/fail is owned by axe running in
  the same container as vrt
  ([0054](../docs/adr/0054-ui-catalog-storybook.md) / [0091](../docs/adr/0091-test-verification-methods.md))
- The rationale for the sidebar order (`storySort`) and `tags: ["autodocs"]` is owned by
  [`src/components/README.md`](../src/components/README.md#storybook-display-conventions) — Storybook Display Conventions

### `preview.css`

- **Only the surface that renders a story (`.sbdocs-preview` / `.docs-story`) is repainted.** Storybook's
  docs have their own theme and do not follow the toolbar's color-scheme switch, so left alone, "our text
  switched to dark" sits on "a white surface Storybook painted" and becomes unreadable. The docs chrome
  (headings, descriptions, the controls table) stays light as Storybook's own — following it that far
  would mean tracing emotion's generated hashed classes one by one, which breaks with every Storybook update
- **Reference the semantic-layer variables** (`--semantic-color-*`). `--color-*` are `@theme inline`
  variables, and some of them are inlined into utilities instead of being emitted as variables, so plain
  CSS cannot resolve them

### `manager.ts`

- **Addon panels go on the right.** a11y violations and Controls are read while looking at the story;
  placed at the bottom they compete with the story for vertical space and get pushed out of view by tall
  stories

## What `lib/` Holds

The home of modules that hold a check and are read by both stories and configuration. One module holds one
decision, and **configuration and stories call that decision instead of copying it**.

| Module | Decision it holds |
| --- | --- |
| `sample-asset` | **The only place** that publishes the spelling of the assets the catalog serves. Stories read URLs from nowhere else, so renaming an asset leaves one place to fix. It writes root-absolute paths so that assets copied to the serving root are referenced regardless of where the story sits |
| `pending-action` | A submission target that never resolves. **Used only by stories that capture the submitting state.** `useFormStatus` collapses when the submission completes, so with a target that returns immediately it is over before capture. The default replacement remains a resolved success ([0054](../docs/adr/0054-ui-catalog-storybook.md)); holding is limited to stories whose subject is the submitting state itself |
| `story-error-boundary` | Shows an exception thrown while rendering or interacting with a story as a single panel in place. It is not there to silence anything but to replace the red stack-trace screen with an explanation, and **it keeps what happened** (text, `data-story-error`, console). It is also where a Server Action that fails loading `config` in the server-less catalog is caught |
| `unhandled-request` | Whether a request that was not intercepted counts as a warning. **Only `/api/*` is reported** — warning on the catalog's own assets and document fetches too would bury the real oversights every time it is opened |
| `contrast` | The contrast ratio of two colors (the WCAG definition). **It is not a pass/fail value.** a11y pass/fail is owned by axe; this outputs a number so whoever reviews the palette can read the difference from the background. It reads only the numeric sequence of `rgb()`, and returns `null` as "could not read" for `color-mix()` and named colors |

**The shapes used by stories of components that submit are collected here.** Writing the stand-in submission
targets (succeed and stay / never resolve) per story scatters the same Promise construction across as many
stories, and when fixing it nobody can tell which one is correct.

## Inventory Stories

The stories placed here are inventories that **do not copy names but read them at runtime from a public
surface or a generated SSOT** (add a subject and it appears in the inventory; copying would leave the
inventory stale when something is added, and it could no longer be trusted as an inventory). `title` is
`<heading>/Catalog` and `layout` is `fullscreen`. Why the heading is not a component layer is owned by
[`src/components/README.md`](../src/components/README.md).

- **CSS values are read at runtime.** Applying `var(--x)` to a hidden probe element and reading it with
  `getComputedStyle` yields the value resolved as a color. To also show the declared expression itself
  (such as `color-mix()`), apply the same variable to a custom property (`--probe: var(--x)`) and read it
  with `getPropertyValue` — the unresolved spelling survives only there
- **A value read at runtime is the value at mount time.** Switching the color scheme or surface does not
  change the effect's dependencies (the list of variables read is the same), so the switching axis is used
  as `key` to rebuild the whole screen. Reusing the same tree leaves the previous values behind
- A namespace import (`import * as`) may be used to read the whole public surface **because this bundle
  appears only in the catalog and is not a component the app renders**

## Wrap sample-bearing configuration in `sample:` markers

The replacement declarations (the `sb.mock` list in `preview.tsx`) and `msw/handlers.ts` enumerate the
sample itself. **Wrap the enumeration in a `sample:` marker and stash a form that still loads after the
sample is discarded (an empty array, an import line without sample-only imports) in `replace-with`** — so
the configuration does not break the moment the sample is discarded. The area excluded from the purge scan
(`public/`) is owned by [`public/README.md`](public/README.md).
The meaning of the markers is owned by [boilerplate-only conventions](../docs/get-started/boilerplate-only-conventions.md). <!-- boilerplate-only:line -->

## Constraints stories inherit from the catalog's container

Rules that come from the catalog's container rather than from the component are owned here. Conventions
for writing stories are in [`src/components/README.md`](../src/components/README.md) and
[`src/features/README.md`](../src/features/README.md).

- **Overlay content leaves the canvas.** Dialog / menu / combobox surfaces are rendered by a Portal directly
  under `document.body`, so `play` takes the opening interaction from `within(canvasElement)` and the opened
  surface from `within(document.body)`. Waiting inside the canvas times out without finding it even though
  it is open
- **When stories that read the same store are placed on one docs page, split them into iframes**
  (`parameters.docs.story.inline: false`). A docs page renders its stories in one tree, so placing stories
  with different store values — open and closed states, for example — side by side lets the value a later
  story sets reach the earlier one. Surfaces that trap focus are split the same way — expanded inline, they
  would make the page itself impossible to operate
- **The return values of replaced Server Actions do not carry over between stories** (`beforeEach` in
  `preview.tsx`). A story that shows how failure looks replaces the return value within that story
- **A story still renders when interception could not be started.** A startup failure is logged to the
  console and execution continues, so only stories that touch `/api/*` fall into the "no response came
  back" appearance. When you see that, read the console first

## How `msw/` answers

- **Two outcomes the contract distinguishes each have an input that reaches them separately.** If the mock
  collapses outcomes the contract returns with different markers and the screen words differently — "no
  match" versus "the mechanism is unavailable", for example — into one, the side the screen distinguishes
  cannot be checked in the catalog
- **A response to an input not in the declarations is returned in the shape the contract defines for "no
  match".** Inventing a mock-specific failure (`404` and the like) sends the screen down a path the contract
  does not have
- **Lists that load more do not get a continuation** (cursor is `null`). Catalog lists hold only a few
  items, so the end marker is visible from the start; returning a continuation would show the end again
  after it arrives and fetch without limit. The DOM never settles, so no baseline image can be captured
  either ([`vrt/README.md#sources-of-flakiness-are-pinned`](../vrt/README.md#sources-of-flakiness-are-pinned))
- **Reconnecting subscriptions are not given a URL that connects.** The ticket-issuing endpoint returns "no
  subject", holding the screen in its loading state. Returning one would actually connect, and every failed
  connection would reconnect, so the story never settles
  ([`mocks/README.md`](../mocks/README.md))
- **Wherever a response returns the same values as a story, read them from the feature's fixture.** Copying
  a list continuation or a list of suggestions into the handler makes the story and the response go stale
  separately
- **The worker script's serving location is referenced relatively (`./mockServiceWorker.js`).** The catalog is published
  under a sub-path, so an absolute path would not find it. A service worker's scope is the directory it is
  served from, and if the page rendering the story is inside it, the page's requests pass through
  regardless of destination
- **Wait for registration to complete before rendering** (`loaders` in `preview.tsx`). Rendering without
  waiting lets only the first fetch go out unintercepted, and only that story shows the failed-path
  appearance. Startup runs once; from the second call on it returns the same Promise
- **A startup failure is not thrown.** What waits on it is the loader shared by every story, so throwing
  would stop even stories that never touch `/api/*` from rendering. It is only recorded, and execution
  continues

## Test Responsibilities

The frontmatter's `test-requirement: unit` applies to `lib/`.

**Anything that holds a check goes in `lib/`.** `main.ts` / `preview.tsx` / `manager.ts` are configuration
that causes side effects the moment they are loaded (copying assets, attaching font classes, declaring
mocks), so they cannot be run on their own. `msw/worker.ts` likewise only starts the browser's service
worker. A check written into configuration or wiring becomes a place no inspection reaches.

**Everything under here is subject to the 1:1 gate and counted in the coverage denominator**
([`vitest.config.ts`](../vitest.config.ts) /
[`scripts/one-to-one.gate.test.ts`](../scripts/one-to-one.gate.test.ts)). What is excluded is declared,
with a reason and a removal condition, by
[`scripts/lib/untested-modules.ts`](../scripts/lib/untested-modules.ts). Excluding by narrowing the scope
leaves no record of the exclusion anywhere.

---
imports-allowed: [features, components, capabilities, stores, adapters, errors, logging, config, model, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [business-logic, direct-fetch]
test-requirement: route
coverage-exclusions:
  - "src/app/**/page.dev.tsx"
  - "src/app/**/page.tsx"
  - "src/app/fonts.ts"
  - "src/app/icon.tsx"
  - "src/app/apple-icon.tsx"
  - "src/app/opengraph-image.tsx"
---

# app

The App Router's driving adapter. `page.tsx` and `layout.tsx` call features thinly, and route handlers connect externally through `adapters/server`.

## What Belongs Here

- Route segments, route handlers, metadata, and mounting cross-cutting UI / Providers in layouts
- The special files and route segments Next.js defines
- **Declaration modules shared by the layout shells of several route groups** (`fonts.ts` / `site.ts` and the like). They fit none of
  the route elements, but written per layout shell only one copy moves. When layout shells that are the same site to the user
  differ only in when they render, the set of navigation links is also held here once — links shown or hidden by role are
  not included; the layout shell that holds the show / hide decision adds them itself. Tests are treated as `unit`
- **Dynamic holes for principal-dependent navigation, placed next to the layout shell**. Navigation shown or hidden by role is plugged into the layout shell as a
  `Suspense` dynamic hole holding a Server Component that reads the session (how the decision is placed: [docs/rules.md](../../docs/rules.md#authorization)).
  It sits next to the layout shell rather than in a feature because only `app` and `adapters` can take `adapters/server/auth`.
  If the layout shell read the session, every screen passing through it would wait for the round trip before returning the first byte.
  Tests are split by rendering state (shown / not shown)
- **Assembly shared by several error boundaries** (`boundary-feedback.ts`). The one place that turns a failure a boundary received into a displayable shape and
  a retry link, and the only place that handles failures from mismatched versions ([docs/rules.md](../../docs/rules.md#forms)).
  Written per boundary, that handling goes stale in one place only. Tests are treated as `unit`
- **Parallel route slots** (`@<name>/`). A page cannot pass props to a layout, so the bridge that delivers per-screen values to the layout shell
  is a slot (such as the hierarchy down to the current location). Place a `default.tsx`, and place per route a slot that returns empty even for screens with no
  hierarchy — in a soft navigation the previous slot remains, and the pitfall is held by
  [docs/design/rendering.md](../../docs/design/rendering.md)
- **Metadata files** (`sitemap.ts` / `robots.ts` / `icon.tsx` / `apple-icon.tsx` /
  `opengraph-image.tsx`). By Next.js convention they become special Route Handlers ([0044](../../docs/adr/0044-seo-metadata-strategy.md)).
  The declaration is held by the `app-metadata` element in `architecture.ts` — `sitemap.ts` / `robots.ts`, which hold the decision of what to list and what to refuse,
  are treated as `unit`, and the three that only return an image hold no decision and are not run
  on their own (`scripts/lib/untested-modules.ts`).
  That they return as images, that the listed URLs exist, and that the canonical URL points at itself are checked by fetching from the running app
  (`make e2e-metadata`)
- **Instrumentation the root layout mounts** (`telemetry.tsx`). A client component that renders nothing and only sends browser-side signals
  to the relay. It can be placed in neither `components` nor `capabilities` —
  neither can hold sending to the outside ([0082](../../docs/adr/0082-client-observability.md)).
  Tests are treated as `component`
- **The consent island the root layout mounts** (`consent.tsx`). A client component that binds the surface asking for consent (`components`) and the gate for
  assets that require consent behind a single subscription. It can be placed in neither `components` nor
  `capabilities` — neither can take `stores`
  ([0031](../../docs/adr/0031-policy-state-supply.md)). Tests are treated as `component`
- **The tag manager placed behind the consent island** (`analytics.tsx`). A client component that reads the container ID from config and loads only in
  deployments that declare one. It cannot be placed in `components` — that cannot take `config`.
  Tests are treated as `component`

**A screen that does not pass through a layout shell places its own `main`.** A screen that stands outside a route group (`not-found.tsx` or
under `dev/`) does not have the landmark the route group's layout places. Without that wrapper, assistive technology
cannot jump straight to the main content.

## What Does Not Belong Here

- Business logic, orchestrating screen use cases, direct fetch from route segments

## Decisions This Layer Owns

What is decided per route lives here. **Some of it can be written in neither this README nor an ADR**
— each screen has a different answer. Where the answer is written is fixed.

| Decision | Where it is declared | Document that holds the answer |
| --- | --- | --- |
| Not being able to serve a static shell (`instant = false`) | `page.tsx` / `layout.tsx` | That screen's functional requirements ([`docs/spec/route/**`](../../docs/spec/README.md)) + [0041](../../docs/adr/0041-cache-components-decision.md) |
| Waiting boundaries (where to put `Suspense`) | `page.tsx` | Same as above |
| Failure and absence surfaces | `error.tsx` / `not-found.tsx` | Same as above + [0080](../../docs/adr/0080-error-handling.md) |
| metadata | `page.tsx` / `layout.tsx` | [0044](../../docs/adr/0044-seo-metadata-strategy.md) |
| Mounting cross-cutting UI and Providers | `layout.tsx` **only** | [0026](../../docs/adr/0026-layout-shell-mount.md) |
| Round trips with the outside | `api/**/route.ts` | [0071](../../docs/adr/0071-bff-api-integration.md) / [0025](../../docs/adr/0025-app-layer-elements.md) |

**A screen does not declare its rendering mode.** Where the static shell and the dynamic holes divide is decided by the shape of the layout shell — what goes outside
`Suspense` and what goes inside ([0041](../../docs/adr/0041-cache-components-decision.md)).
It holds no segment config such as `dynamic` / `revalidate`. **Only a screen that cannot serve a static shell
declares `export const instant = false` with a reason**, and `scripts/render-mode` checks it against the prerender
result.

**The reason a screen cannot serve a static shell is written in the specification.** Placed only in a doc comment next to the route, it becomes impossible to trace
from the documents when that screen renders. What stays in a code comment is only a caution that takes effect
right there.

**The same goes for waiting boundaries.** Whether to split per section or use one for the whole screen is a screen's decision
determined by what it waits on together, not a layer default.

### Static Shell and Dynamic Hole Pattern

`page.tsx` fits one shape. The default export returns the **static shell**, and the async
`<Screen>Content` in the same file takes on the **dynamic hole**.

```tsx
export default function ScreenPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ContentContainer>
      <PageHeader>…</PageHeader>                {/* 殻。待たずに配れる */}
      <Suspense fallback={<ScreenSkeleton />}>  {/* 穴。fallback は feature の ui/skeleton */}
        <ScreenContent params={params} />       {/* Promise のまま渡す */}
      </Suspense>
    </ContentContainer>
  );
}

async function ScreenContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;                  // params / searchParams を解くのはここ
  await requireXxx(screenPath(id));             // 主体に依る判定もここ。殻に主体の情報は載らない
  return <ScreenPageContent id={toXxxId(id)} />; // 識別子を契約の型へ通すのもこの層
}
```

- **The layout shell does not await `params` / `searchParams`.** It passes the Promise as is to the dynamic hole and resolves it inside. If the layout shell
  waits, not even the static shell can be served while it waits ([docs/rules.md](../../docs/rules.md#rendering))
- **Passing identifiers through the contract's type** (`model`'s `toXxxId`) **is this layer's job**; features receive the passed value
- **The real clock is read inside the dynamic hole after awaiting `connection()`** (`config/clock`). During prerendering
  the value is not settled
- **A redirect inside a dynamic hole happens after the static shell has been served.** The response has gone out as 200, and the redirect is conveyed by a
  meta tag rather than `Location`. The unauthenticated case is handled by the front gate (`proxy.ts`) at the entry point as a real redirect, so what reaches here is
  only decisions that cannot be known without asking the backend (such as state about a principal that only the backend holds)
  ([0041](../../docs/adr/0041-cache-components-decision.md) / [0079](../../docs/adr/0079-auth-frontend-seam.md))
- **A missing primary resource is also conveyed with 200.** That it was not found is conveyed by `not-found.tsx` and `noindex`
  ([0080](../../docs/adr/0080-error-handling.md))
- **A section that cannot serve a static shell before checking has the layout shell decide and declare `instant = false`.** Push the decision down into a dynamic hole and
  that surface's static shell (the section's name, its navigation) is served to anyone before the check
- **Do not give `Suspense` a `key`.** The range refetched when conditions change is delimited inside the feature's `page-content`.
  Give the layout shell's boundary a key and even the filter input fields drop into the loading UI. On a screen that wants the refetch range
  narrower than the screen, place the waiting boundary itself on the feature side, and the layout shell holds only the static shell
- **Place a heading only once.** A screen whose current location (breadcrumbs) serves as its heading, and a screen that uses the full screen height for its body,
  do not place `PageHeader`. What screen it is, is shown by the tab title (`metadata.title`) and the nav
- **Make display and editing, and a list and a single item, separate routes.** Combined in one screen, which state it was opened in
  is lost from the URL, and neither going back nor sharing works
- **The layout shell passes Server Actions to the feature.** `page.tsx` imports the neighbouring `actions.ts` and hands it to the feature's
  `page-content` as props. A feature cannot take `app`, so it can only take the shape of receiving the submission target.
  For the same reason, `NEXT_PUBLIC_` public constants are also read by the layout shell and passed down, and the screen decides with the values it receives
- **Text placed in the static shell is complete within the static shell.** Things that should be seen before reading starts, such as caveats and warnings, go
  before the heading and outside `Suspense`. Shown after waiting for a fetch, the screen looks ordinary while it waits

The division of the feature side's `page-content` / `view` / `ui/skeleton` is held by [features/README.md](../features/README.md).
A worked example of adding one route is [docs/tutorial/build-a-screen.md](../../docs/tutorial/build-a-screen.md).

### Conventions for Failure and Absence Surfaces

Responsibilities and boundary granularity are held by [0080](../../docs/adr/0080-error-handling.md). What is here is the part that repeats
the same shape in this layer.

- **`error.tsx` does not compose text.** In production the body thrown from a Server Component is redacted, and only
  `digest` reaches the boundary. Text is taken per classification from the `errors` catalog, and `digest` is shown as an inquiry
  number. The display and the retry link are assembled in one place by `boundary-feedback.ts`
- **`error.tsx` does not wrap the `layout.tsx` of the same segment.** Leave it to the parent's boundary and not just the failed child but
  the breadcrumbs and navigation the parent placed disappear with it. On a screen where losing the way back just because one fetch failed is out of proportion,
  place a boundary in that screen's segment. Without one, the failure falls through to `global-error.tsx`, a bare screen re-rendered from
  `html` / `body`
- **`global-error.tsx` is styled with inline styles only.** This boundary appears when the root layout itself has broken, and
  neither `globals.css` nor design tokens nor Providers can be relied on. Relying on classes can produce a screen whose text is unreadable
- **`not-found.tsx` holds only display.** Text is taken from the catalog, and a single way back goes up one level.
  "Someone else's" and "does not exist" are not distinguished ([docs/rules.md](../../docs/rules.md#authorization)).
  **A screen that calls `notFound()` is placed under a segment that has a `not-found.tsx` inside the layout shell.** `notFound()`
  is received by the nearest ancestor `not-found.tsx`, and the layouts from that segment up remain — if there is none inside the layout shell, a
  `not-found.tsx` above the layout shell (by default, root) receives it, the route group's layout shell drops out entirely, and the navigation and breadcrumbs disappear
- **A definitive failure does not reach the boundary.** The Server Action returns it as a result, and it is shown next to the operation. What reaches the boundary is
  when the very content to be checked could not be read

### Metadata Base and Per-Route Differences

The root layout places `metadataBase` (the externally visible origin; `config/site`) and `title.template`, and in environments not to be indexed
also `noindex`. What each segment declares is the difference from there, and what it places is fixed.

| Screen | What it declares |
| --- | --- |
| A screen anyone can open and that should be indexed | `title` / `description` / `alternates.canonical` (its own path) |
| A screen that requires authentication, a screen whose content varies per user | In addition to the above, `robots: { index: false, follow: false }`. Hidden even in environments that are indexed |
| A screen with a dynamic segment | `generateMetadata`. The decision that maps the fetch's classification is placed in a module on the feature side, and the page calls it thinly |

canonical is not placed at root because `alternates` is replaced wholesale per segment. Placed at root,
every screen that does not declare it would claim `/` as its canonical URL.

`sitemap.ts` lists only screens that should be indexed, and the paths `robots.ts` refuses are taken from the protection declarations (`model/authz`).
Neither holds a hand copy.

- **`robots.txt` and `noindex` are both held.** They act on different things — `robots.txt` stops crawling itself, and
  `noindex` removes crawled results from the index. `robots.txt` matching is by prefix and ignores separators, but
  it only errs on the side of refusing more broadly, so it is harmless
- **`robots.ts` is rendered statically, with the build-time settings baked in. `sitemap.ts` awaits `connection()` and
  is built at request time.** If the listed paths include a list fetched from the backend, fetching at build time would presuppose that the place
  building the deliverable can reach the backend, and the list at that moment would be baked in
- **A walked list is held across requests** (`use cache` + `cacheLife`). Crawlers open the same URL repeatedly, so
  walking to the end on every open inflates one request into as many backend calls as the list has entries. Inside `use cache`
  cookies cannot be read, so walking is limited to endpoints that do not name a principal
- **Cut off at the Sitemaps protocol limit (50,000 URLs per file).** Rather than silently dropping what does not fit,
  make it readable from the listed count that splitting (`generateSitemaps`; [0044](../../docs/adr/0044-seo-metadata-strategy.md)) is
  needed. How to split is decided by the path structure, so the core holds no splitting
- **Do not attach `lastModified` / `changeFrequency` / `priority` without a basis.** The update time only when the contract returns it;
  the rest are values search engines read only as a hint
- **Even if fetching the list fails, paths that do not depend on the backend are listed** ([0044](../../docs/adr/0044-seo-metadata-strategy.md)).
  Classifying and recording the failure has been done at the `adapters` boundary, so it is not recorded again here

### Metadata Files That Return Images

- **They cannot be written with `export … from`.** Next.js reads a metadata file's exports as segment settings, and
  treats re-exports as invalid and stops the build. Values such as `alt` are imported and exported under your own name
- **The tab icon, the home-screen icon and `favicon.ico` are one set of three.** `favicon.ico` is kept for paths that fetch `/favicon.ico`
  directly without reading `<link>`; when replacing the mark, keep all three in step.
  The home-screen icon does not round its corners — the placing side cuts it into its own shape, so it would be trimmed twice
- **`ImageResponse`'s default typeface has Latin characters only.** If drawing a string that includes Japanese text, decide on
  bringing in a typeface at the same time as deciding the image. That is why the root OG image draws only the site's name

### Conventions for Islands the Root Layout Mounts

What to place is held by [`docs/spec/route/layout.function.md`](../../docs/spec/route/layout.function.md), and where supply and
the sending surface live by [0031](../../docs/adr/0031-policy-state-supply.md) / [0082](../../docs/adr/0082-client-observability.md) /
[0131](../../docs/adr/0131-cookie-consent.md). What is here is the shape for writing an island.

- **An island that reads the request context is not settled inside the static shell.** If the layout shell extracts and passes a value that varies per request, such as
  `traceparent`, that extraction is enclosed in a `Suspense` dynamic hole. Only a dynamic hole that renders nothing may use
  `fallback={null}` ([0080](../../docs/adr/0080-error-handling.md))
- **The surface asking for consent and the gate for assets that require consent go in one island.** Both look at the same consent state;
  placed separately there would be two subscriptions, and a moment right after choosing where only one reacts. What is passed to the gate's `children`
  is only what must not load without consent, and while not consented the element itself is not rendered — disabling it by
  attribute cannot stop assets whose fetch starts the moment the element exists. The layout shell decides what goes behind it, and
  also holds where the documents shown as material for the decision point to (baked into a component, moving a document would mean rewriting the component)
- **Third-party scripts behind the consent gate are loaded dynamically.** Imported statically, the library's code lands in the initial JS even of a deployment that dropped the dependency (the
  side that left the container ID empty). A loaded script does not go away on unmount (neither one added to `document.body` in an effect
  nor an `async` `<script src>` — React treats them as resources and does not remove them), so
  withdrawing consent takes effect only from the next load. For a library whose loading strategy cannot be chosen by prop,
  pin the currently effective value in a test so it fails the moment the default changes
- **A value read from a cookie and passed to a third party has its shape checked before passing.** A cookie that cannot be given `httpOnly`
  can be written by others, and how the recipient uses the value is outside this side's jurisdiction. The shape of values this side emits is guaranteed by this side
- **A value delivered right after consent is picked up again on every navigation.** A value the front gate delivers is carried from the first request after consent is written,
  so a single pick-up at mount does not get it. Pass the path as `key` to the component that picks it up so it is recreated per navigation, and keep the passed
  value in a module variable so the same value is not passed twice (kept inside the component, it would vanish on every recreation)
- **An island that sends browser-side signals to the relay leaves sending to `adapters/client`, and loads instrumentation through a dynamic import
  after mount.** The route attached to Web Vitals is the route where loading started, and the route attached to an exception is
  the route at the time it occurred ([docs/design/observability.md](../../docs/design/observability.md)).
  Exceptions sent per load are cut off at a cap — in a breakage where rendering keeps throwing, the same exception rises every frame
- **The cross-cutting notification Provider is placed outside the single element that wraps the screen body**
  ([`docs/spec/route/layout.function.md`](../../docs/spec/route/layout.function.md#画面は-1-つの器で包み横断通知はその外へ出す))

## What to Change When Adopting

**The site's identity is held in one place, `site.ts`.** The initialization command rewrites the repository's identifiers,
but does not touch this. metadata, the OG image and the icons read the same value, so **unless it is rewritten, your
site keeps presenting itself under this repository's name.**

| What | Default | Where to change it |
| --- | --- | --- |
| Site name | The same spelling as the repository name. Read by the title template, the OG image, and each layout shell's header | `SITE_NAME` in `site.ts`. **Latin spelling only** — the default typeface that draws the OG image has no Japanese glyphs, and only the image would be missing them |
| Site description | A sentence describing this repository itself. Goes into root's `description` | `SITE_DESCRIPTION` in `site.ts` |
| The mark drawn on the icon | One character | `SITE_MONOGRAM` in `site.ts`. The drawing side decides the frame size, so one character only |
| Typefaces | Japanese uses the OS-bundled gothic; headings and monospace use the bundled Latin typefaces | Both `fonts.ts` and [`tokens/README.md`](../../tokens/README.md#boilerplate-導入時の変更点). Do not apply a named typeface that has Latin characters only to strings containing Japanese — only the Japanese falls to the next typeface, and the typeface changes within a single word. If adding a Japanese web font with `next/font`, re-measure the cost — every numbered-slice `@font-face` lands as render-blocking CSS |

The externally visible origin and whether to index are environment variables, held by [`env/README.md`](../../env/README.md#boilerplate-導入時の変更点). `site.ts` holds only the environment-independent identity.

To replace the tag manager loaded behind the consent gate with another, change both `analytics.tsx` and the delivery headers'
allowed origins ([`src/config/README.md`](../config/README.md#what-to-change-when-adopting)).

## Operations

- **The `route` declaration applies to the composition of route segments (`page.tsx` / `layout.tsx`)**.
  **Route Handlers (`api/**/route.ts`) are treated as `integration`** —
  [0090](../../docs/adr/0090-testing-strategy.md)'s per-layer responsibility table defines integration as "the HTTP boundary only
  (the boundary of `adapters`' API clients / route handlers)", and this is verification of a boundary, not composition of
  a layout shell. In practice they are written by replacing the module boundary with `vi.mock` and checking the response's status and
  shape

- **Server Actions (`actions.ts`) are treated as `unit`** — they are neither the composition of a layout shell nor an HTTP boundary, but
  **subjects that return a value** ([0090](../../docs/adr/0090-testing-strategy.md)'s axis is decided by what the subject
  returns, split by `正常系` / `異常系` comment separators). They are written by replacing at the module boundary the
  session that asserts the principal and the adapter called, and checking **the classification of the returned `ActionState`, the
  revalidation on success, and the destination**. The HTTP round trip is held by the adapter's tests, so it is not held
  here

- **A module that a receiving endpoint's body was moved out into is treated as `unit`** — when `route.ts` / `actions.ts` stay
  thin endpoints and delegate decisions and assembly to a neighbouring module, that module is `unit` regardless of
  its caller. The test is **whether it holds the assembly of the response (`Response` and the status code)**; if it does not and
  returns a value, it falls here (`dev/session/authorize-development-session.ts`). It is not decided by whether it takes a `Request`
  as an argument — even if it receives one, if what it returns is a value the axis is
  `正常系` / `異常系`. Moving it out is needed when a Route Handler cannot take `features` but the redirect target is decided by the feature's
  vocabulary (the failure classification) — the neighbouring module builds and returns a discriminated union down to the redirect target, and
  `route.ts` holds only closing the endpoint and converting to the HTTP shape. A response that receives a POST and sends elsewhere
  uses 303 (left as 302, the browser may reopen the destination with a POST). The body size limit is also
  held by the receiving endpoint itself — `bodySizeLimit` in `next.config.ts` reaches only Server Actions

- **Server Actions share one shape.** Each file holds one assertion helper (`assertXxx`), called at the start of
  each exported action. When the assertion fails, **return it as an `ActionState` rather than throwing**
  (`actionStateFromError`) — a failure is shown next to the operation and is not allowed through to the boundary. Then parse the submission with the feature's
  parser, call `adapters/server`, and return the result. When there are per-field errors, the overall message is
  not shown (the summary would say the same thing, and the same point would appear in two places). The catalog's default text conveys only the classification, so
  screen-specific text is applied only when the reason for rejection can be stated only on that screen (a version conflict, related work still in progress).
  Where to send after success has three cases:
  - **Send to the list with `redirect()`** — when staying on the same screen would make pressing again a double create or double update, and it
    cannot be undone because it has already succeeded
  - **Stay and have it refetched with `revalidatePath()`** — when a succeeded row remaining in the list would keep showing an operation that
    always conflicts if pressed. Even if cut off partway, have it refetched if even one went through (conveying why it was cut off and
    reflecting what succeeded in the list are separate matters)
  - **Stay and do nothing** — when cleanup continues under eventual consistency and refetching right away would only show
    "a list not yet reflecting it". What happened is conveyed by the submission result
  An action that sends several items in order does not run them in parallel — when one is rejected partway, it becomes impossible to count
  how far it got. One item that did not go through under the current circumstances is counted and the action moves on; a failure that would happen the same way for the next item (no
  role, the target is down) stops it. It is a failure only when not a single item went through

- **`route` tests check "what was plugged into which dynamic hole", not the dynamic hole's contents.** A dynamic hole's contents are a Server Component that
  waits for a fetch and cannot be resolved by the client renderer. Replace the contents with a marker (`vi.mock`), and leave
  verifying the contents themselves to that component's tests. Pin how the loading UI looks with contents that return a Promise that never resolves.
  A layout shell that renders the header and navigation needs `next/navigation` (`usePathname` / `useRouter`) supplied.
  The root layout renders `html` / `body`, so it is checked with `renderToStaticMarkup`. `metadata`, decided when the module is evaluated,
  is reloaded with `vi.resetModules()` after changing the configuration replacement

- Imports that cross layers use the `@/*` alias
- Do not create places such as `common`, `shared`, `utils`, `lib` that do not indicate a role
- Code dedicated to a single feature goes in `features/<name>/`
- Only `layout.tsx` may mount cross-cutting UI and Providers; `page.tsx` calls only features. Mounting means **placement only**, and does not include calling hooks in a layout to assemble data
- The root layout mounts the cross-cutting notification Provider. The side that shows a notification only needs to call `useToast()`, and holds neither the queue's state nor the dismiss wiring. However, do not lift display state that is complete within one screen to global through here
- metadata is declared with the Metadata API. Hand-written `<head>` and `next/head` are not used. The allocation of base and differences is held by *Metadata Base and Per-Route Differences*
- **Route segments do not hold rendering spans.** Next.js opens `render route (app)`, so the same range is not held twice. Attribution within the screen is held by the top of the feature layer ([observability/README.md](../observability/README.md))
- **The layout shell is laid by the route group's `layout.tsx`, not the root layout.** The root holds only `html` / `body` and mounting Providers; choosing the layout shell is done by the level below. If the audience differs, split the layout shell; if the rendering time differs (wanting to serve everything beneath with only its build-time appearance), the layout shell steps down to where it touches neither cookies nor the backend — that layout shell shows no navigation read at request time (principal-dependent entry points), and not showing it is the safe side. How layout shells are split, and that a route group is also a boundary of client state, is [0026](../../docs/adr/0026-layout-shell-mount.md)
- **A journey Provider placed next to a layout shell is limited to state that may be lost once the user leaves that journey** ([0026](../../docs/adr/0026-layout-shell-mount.md)). Place it outside a layout shell that folds when its contents become empty — held inside the layout shell, its memory is lost when the contents become empty and the layout shell folds
- **What `globals.css` holds is only bundling imports, the `dark` variant, and re-applying typefaces per family.** The `dark` trigger condition must match the tokens generator, and the canonical source of that condition is [`tokens/README.md`](../../tokens/README.md). `font-family` is re-applied with `[data-surface]` because it is an inherited value, and merely swapping a variable does not reach the subtree
- **`FONT_VARIABLES` uses the same definition on both `<html>` and the catalog's stories.** `next/font` carries variable declarations on a class, so an ancestor of any element reading the variables always needs this class
- **Development-only entry points (`page.dev.tsx` / `route.dev.ts` / their actions) call the environment check per entry point** ([0113](../../docs/adr/0113-development-access-surface.md)). They are placed outside route groups, so they place their own `main`

## Audit Criteria

| Criterion | How It Is Judged | Basis |
| --- | --- | --- |
| `forbidden: business-logic` — no element holds computation of values the contract does not return, business decisions or heavy aggregation. The same goes for `error.tsx` / `not-found.tsx` / `loading.tsx` | violation. When it cannot be read whether what it holds is formatting for display or a business decision, suggestion | [0021](../../docs/adr/0021-frontend-responsibility.md), item 4 of what a kernel must satisfy / [0025](../../docs/adr/0025-app-layer-elements.md) prohibitions / [0070](../../docs/adr/0070-backend-role-separation.md) prohibitions / [0080](../../docs/adr/0080-error-handling.md) prohibitions |
| `forbidden: direct-fetch` — route segments call neither `fetch` nor `adapters`' fetch endpoints. Fetching belongs to features. The only exception is protecting the entry point (call `verifySession()` in `adapters/server/auth`, decide with a `model` predicate, and `redirect()`). Route Handlers also hold no raw `fetch` and go through `adapters` | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) dependency matrix / [0025](../../docs/adr/0025-app-layer-elements.md) element table and prohibitions / [api/README.md](api/README.md#what-does-not-belong-here) |
| `observability` in route segments is only for mounting instrumentation — the root layout extracts the active span's trace correlation and passes it to the client component it mounts. It is not taken to create or record spans | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) note to the dependency matrix / [0025](../../docs/adr/0025-app-layer-elements.md), on what cannot be expressed as a set of import targets. The machine does not reach it (`route-segment` is not declared as an element) |
| The `config` a route segment reads directly is only values Next.js's conventions require placing in a route segment (`config/site` read by metadata, `config/clock` read by the screen as "now"). Route segments import no other `*.server.ts`. Direct reads in `page.dev.tsx`, which does not go into the production bundle, are a known shape 0025 records and out of scope | violation | [0021](../../docs/adr/0021-frontend-responsibility.md) Enforcement / [0025](../../docs/adr/0025-app-layer-elements.md) prohibitions / [config/README.md](../config/README.md#operations). The machine does not reach it |
| Server Actions (`src/app/**/actions.ts`) call the `adapters/server/auth` assertion inside each exported action. They do not rely on the rendered screen being protected | A violation if there is no call. If it calls one, whether it is sufficient as a role or ownership decision is a suggestion | [0025](../../docs/adr/0025-app-layer-elements.md) prohibitions / [0021](../../docs/adr/0021-frontend-responsibility.md), on where Server Actions live / [docs/rules.md](../../docs/rules.md#authorization) |
| Server Actions do not read `server config` (`*.server.ts`). `NEXT_PUBLIC_` public constants (`*.client.ts`) may be read | violation | [0025](../../docs/adr/0025-app-layer-elements.md) prohibitions, and its account of how much of its table the machine enforces. The machine sees `config` only at layer granularity, and this distinction does not reach it |
| A Route Handler is a thin proxy holding only relaying and input/output validation, and stays on the Node runtime. Building status and body from a classification is done by `adapters/server/http`'s endpoints, not assembled inside the handler | A violation if the runtime declaration is changed. A suggestion if the response is assembled inside the handler | [0025](../../docs/adr/0025-app-layer-elements.md) element table / [docs/rules.md](../../docs/rules.md#layers) / [api/README.md](api/README.md#how-failures-are-returned) |
| No `"use client"` in a route segment's layout shell (`layout` / `page` / `template` / `default`) | violation | [docs/rules.md](../../docs/rules.md#layers). Machine: ESLint `no-restricted-syntax` (`eslint.config.ts`) |
| Only `layout.tsx` mounts cross-cutting UI and Providers, and mounting means placement only. `page.tsx` only calls features, and layouts do not call hooks to assemble data | violation | [0026](../../docs/adr/0026-layout-shell-mount.md) prohibitions / this README, *Operations* |
| No segment config (`dynamic` / `revalidate` and the like). Only a screen that cannot serve a static shell declares `export const instant = false` | violation | This README, *Decisions This Layer Owns* / [0041](../../docs/adr/0041-cache-components-decision.md) |
| metadata is declared with the Metadata API, without hand-written `<head>` or `next/head`. Each segment declares the differences the *Metadata Base and Per-Route Differences* table defines | A hand-written `<head>` / `next/head` is a violation. A missing difference the table requires (`alternates.canonical`, `robots` on screens requiring authentication) is a suggestion | This README, *Metadata Base and Per-Route Differences*, *Operations* / [0044](../../docs/adr/0044-seo-metadata-strategy.md) |
| The layout shell (`page.tsx`'s default export) does not await `params` / `searchParams` / cookies / the real clock, and resolves them in a dynamic hole (an async component inside `Suspense`). Only a screen that declared `instant = false` with a reason waits in the layout shell | A violation if it waits in the layout shell without the declaration | This README, *Static Shell and Dynamic Hole Pattern* / [docs/rules.md](../../docs/rules.md#rendering) / [0041](../../docs/adr/0041-cache-components-decision.md). Machine: `scripts/render-mode` checks the declaration against the prerender result |
| `error.tsx` / `not-found.tsx` / `global-error.tsx` take text from the `errors` catalog (or `boundary-feedback.ts`), do not show `error.message`, and do not compose text themselves | Rendering `error.message` and composing text inside the boundary are both violations | This README, *Conventions for Failure and Absence Surfaces* / [0080](../../docs/adr/0080-error-handling.md)'s decision to make error special files thin boundaries that show only normalized text. The machine does not reach it — up to the range each boundary's tests (not showing the raw body) pin |

## Related ADRs

The decisions this layer's code depends on. **Comments do not point at ADRs directly; they follow this section** —
ADR numbers and sections both move, so the place where a move can be noticed is consolidated into one ([docs/rules.md](../../docs/rules.md#comments)).
Dependencies differ per element, so they are divided by element.

### Whole Layer

- [0025](../../docs/adr/0025-app-layer-elements.md) — This layer's elements (route segment / route handler / server action / metadata) and what each can hold
- [0090](../../docs/adr/0090-testing-strategy.md) — Per-layer verification responsibilities (the allocation of `route` / `integration` / `unit`)

### route segment (`page.tsx` / `layout.tsx` / `error.tsx` / `not-found.tsx`)

- [0040](../../docs/adr/0040-routing-rendering-strategy.md) — Adopting the App Router, and not forcing a rendering mode as boilerplate
- [0041](../../docs/adr/0041-cache-components-decision.md) — Whether to adopt Cache Components (PPR). How static shells and dynamic holes are divided
- [0026](../../docs/adr/0026-layout-shell-mount.md) — Only layouts may mount cross-cutting UI and Providers
- [0079](../../docs/adr/0079-auth-frontend-seam.md) — The front gate at the entry point, and where definitive authorization passed on the screen lives
- [0112](../../docs/adr/0112-data-classification-cache-boundary.md) — Which side of the cache boundary principal-bound values go on
- [0080](../../docs/adr/0080-error-handling.md) — The responsibilities of failure and absence surfaces (`error.tsx` / `not-found.tsx`)
- [0113](../../docs/adr/0113-development-access-surface.md) — The conditions under which development-only routes (`page.dev.tsx`) are included in the build, and the per-entry-point check

### route handler (`dev/**/route.dev.ts`)

Everything under `api/` is held by [api/README.md](api/README.md).

- [0029](../../docs/adr/0029-type-design-discipline.md) — Parsing at the boundary, and the discipline for the types of returned values
- [0075](../../docs/adr/0075-file-upload-seam.md) — The seam for when a receiving endpoint receives a body
- [0080](../../docs/adr/0080-error-handling.md) — Mapping classifications to status
- [0113](../../docs/adr/0113-development-access-surface.md) — Returning 404 when a development-only entry point is closed

### server action (`actions.ts`)

- [0025](../../docs/adr/0025-app-layer-elements.md) — The decision to place actions that need a principal assertion in this layer (`app/server-action`)
- [0075](../../docs/adr/0075-file-upload-seam.md) — The upload seam. The receiving endpoint is the last checkpoint

### metadata (`sitemap.ts` / `robots.ts` / `icon.tsx` / `apple-icon.tsx` / `opengraph-image.tsx` and each segment's declarations)

- [0044](../../docs/adr/0044-seo-metadata-strategy.md) — How the Metadata API is used, whether to index, and canonical
- [0045](../../docs/adr/0045-fonts-and-images.md) — The policy for typefaces and images (including OG images)

### Islands the root layout mounts (`telemetry.tsx` / `consent.tsx` / `analytics.tsx`)

- [0031](../../docs/adr/0031-policy-state-supply.md) — What supplies consent / feature flag state
- [0082](../../docs/adr/0082-client-observability.md) — Collecting Web Vitals and client exceptions, and where the sending surface lives
- [0131](../../docs/adr/0131-cookie-consent.md) — The decision not to adopt consent management
- [0077](../../docs/adr/0077-bff-abuse-protection-boundary.md) — Where the defence of a receiving endpoint that requires no authentication is held

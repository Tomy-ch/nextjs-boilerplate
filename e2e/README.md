---
test-requirement: unit
coverage-exclusions:
  - "e2e/**/*.spec.ts"
  - "e2e/lib/test.ts"
---

# e2e

**Verification through screens.** Runs the assembled application in a real browser and checks only what
cannot be seen from a component on its own.

It **looks at a different subject** from story-level checks ([`vrt/`](../vrt/README.md)). Those see a
component rendered on its own; this sees the screens assembled from components, and the paths across
screens. Components can each be green and still produce a layout that breaks when they are placed together,
or transitions that do not connect.

## What it checks

| | What it checks | Why only here |
| --- | --- | --- |
| Journeys | Transitions across screens, filtering, authentication pre-handling | Whether a path connects cannot be answered by a single screen |
| Browser Errors | Hydration mismatches, exceptions during rendering, network failures, CSP violations | **A hydration mismatch passes both the build and type checking.** It appears only when rendered on a real browser. CSP violations are the same: a check that reads headers (DAST) does not see the result of enforcement |
| Responsive | Per-band variation ([`docs/rules.md`](../docs/rules.md#layout)) | Bands are a function of the viewport, and jsdom has no width |
| History | Whether an overlaid surface and screen navigation fight over the same history | The conflict is between real browser history operations; jsdom has no counterpart |
| Cross Browser | Breakage specific to a rendering engine | Passing on one engine does not mean passing on the other two |
| Cross-origin | That the BFF can be read from a declared origin, and that writes from an undeclared origin are stopped | Automatic preflight and CORS read restrictions exist only in a real browser. The document of the declared origin is served on a separate port by the launcher (`scripts/e2e/partner-origin.ts`; faking it gets stopped by Chromium's Private Network Access) |
| Screen-level appearance | Comparison against a whole-screen baseline image | Adding up every component comparison does not give the result of placing them together |
| Screen-level a11y | Landmarks, `main`, h1, and the served document ([`lib/a11y-rules.ts`](lib/a11y-rules.ts)) | A story renders a component on its own, so these four do not hold, and it would evaluate Storybook's iframe document |
| Not-found surface | When an item is not found, whether the not-found boundary inside the layout shell catches it and conveys the absence while keeping navigation | **Which boundary catches it is decided by the segment tree.** Rendering tests render components on their own and have no segments |
| Focus | Whether an overlaid surface receives focus, traps it, and returns it on close | **jsdom has no focus implementation.** It has neither `inert` nor a focus trap, and the `Tab` order is an approximation |
| Service suspension | Whether a process started with `APP_MAINTENANCE_MODE=on` actually replaces every route | **Both the entry point branch and the configuration are verified per layer only through mocks.** The wiring is unknown until it is started |
| Public surface | Whether `robots.txt` / `sitemap.xml` / each screen's canonical / icons and OG images hold in the form crawlers read. Both the indexable and the non-indexable settings ([`docs/rules.md`](../docs/rules.md#config)) | **Metadata can be broken without the screen breaking.** An empty sitemap, a canonical pointing at someone else, an `ImageResponse` that fails at runtime all pass the build and unit tests |

**The perspectives outlive the specs.** The table above still holds after the specs are rewritten for your
own screens. **When rewriting, do not drop a perspective** — each is one unit tests cannot reach in
principle, and dropping one is not picked up by another. Dropping History in particular leaves nobody
watching for "navigation that does not move when pressed".

## Writing each perspective

The perspectives are owned by the table above; this section holds the decisions that matter when turning
each into a spec. The same shapes hold in rewritten specs.

### Specs that check a mechanism point at a screen with no fetch, independent of the sample

Consent, CSP, cross-origin, the public surface, authentication pre-handling and service suspension are all
applied to every screen by the root layout or the entry point, so the screen they point at needs no sample.
Choose **a screen that fetches nothing from the backend** — pointing at a screen with a fetch makes the
mechanism check fail together with that fetch. When a property is needed, choose by it.

| Property needed | Why |
| --- | --- |
| A screen that can be served statically | Only a static screen proves that the `cache-control` set by pre-handling survived to serving. On a dynamic screen the framework sets `no-store` itself |
| A screen that does not refuse indexing | Login and the maintenance screen declare `noindex` themselves, so they are not part of the public surface the sitemap lists |
| A path that does not exist | That protection is decided by prefix alone, and that during suspension everything is replaced regardless of whether the path exists, can be verified precisely on a path with no screen (declared, with a reason, to the gate described below) |

### History

For the destination, choose **a screen that does not rewrite its own URL**. A screen that puts state in the
URL, such as a list, pushes one history entry right after arriving, and the back-navigation check is
absorbed by that entry. The check is "one back navigation returns to the screen before the surface was
opened" — if the entry the surface pushed remains, the first back is a no-op on the same URL, and the
original screen is reached only on the second.

### Not-found surface

**Open it with the target set to `absent`.** The contract-driven mock answers any identifier, so the
not-found state is reachable only through a reserved identifier ([`mocks/absent.ts`](../mocks/absent.ts)).
"The not-found surface appeared" is not enough as a check — falling through to a surface outside the layout
shell shows the same text, so it also checks **that the layout shell remains** (header).

### Focus

Three things are checked — focus enters the surface when it opens, `Tab` does not escape to the background
while it is open, and focus returns to the opener when it closes. It is not exhaustive; **one spec per
mechanism (drawer / modal / menu)** is kept.

- **Entering and returning are one spec.** The order itself is the check; looking at the return target
  without focus having entered cannot tell whether it returned or never moved
- **`Tab` is checked at every step of the cycle.** Once it escapes even once, everything after can touch
  the background
- **Menus count as trapping too.** What is verified is not conformance to a pattern but "focus does not
  leak outside the open surface", so the check applies the shape the implementation actually promises
- Run at the width where the trigger for the overlaid form appears (`md - 1`). At widths where the content
  can sit permanently at the side, that surface does not exist at all

### Per-band variation

Kept separate from the appearance comparison (`visual/`). That answers "did it change from before"; this
answers "does it vary as decided". Retaking baseline images makes the former pass, but a broken variation
shows up only in the latter. Bands are run from the declaration ([`lib/viewports.ts`](lib/viewports.ts));
specs contain no numbers.

### CSP

Rendering engines differ on whether they report with the split directive (`script-src-elem`) or the
original one (`script-src`). Both are accepted.

### Cross-origin

A Node-side client (`page.request`) cannot exercise the opening side — automatic preflight and read
restrictions exist only in a real browser. Open the declared origin's document and `fetch` **from inside
it**. The closing side is verified by setting an `origin` header on `page.request`. The proof of arrival is
being able to read the status the handler returned, not the `TypeError` that `fetch` throws when CORS
blocks reading.

### Public surface

Responses are **read as strings**, not built into a DOM. Metadata can stream in after the static shell and
be appended to the end of `<body>` (`generateMetadata` streaming), and looking only at `<head>` misses it.
URLs are compared in resolved form rather than by spelling — the sitemap writes the root as
`https://a.test/`, while the canonical outputs `metadataBase` plus `/` as `https://a.test`, so the strings
do not match.

### Authentication pre-handling

Logout does not follow redirects (`maxRedirects: 0`). What is verified is not the return destination but
"that you can no longer go back".

### Navigating from a list to a single item

The destination is matched against the `href` the list built itself, **not by name**. The mock builds
responses independently per endpoint, so nothing in the contract guarantees that an item in the list and an
item in the detail refer to the same entity.

## Test Responsibilities

The frontmatter's `test-requirement: unit` applies to **the checks in `lib/` that run from Vitest**.
`*.spec.ts` is the body Playwright runs and cannot be called from Vitest. Checks such as what counts as an
anomaly and which screens to open are split out into `lib/` because inside a spec they could not be a 1:1
subject.

## Usage

```bash
make e2e          # 主要ジャーニーを回し、画面の見た目を基準画像と比較する
make e2e-maintenance  # 配信を止めた状態で起動し、停止の機構が成立することを確かめる
make e2e-metadata # 索引させる設定で build して起動し、公開面が成立することを確かめる
make e2e-update   # 画面の基準画像を撮り直す（置き場へ送るのは make baseline-push）
make e2e-retake   # 撮り直して置き場へ送る（e2e-update → baseline-push）。手元から撮り直す入口
make e2e-report   # 直前の実行の HTML レポートを開く
make e2e-review   # CI が落とした画面を手元で開く（後述 "Opening failed screens locally"）
make review-clean # 見直しで生やした作業ツリーを片付ける
```

`E2E_ARGS` passes arguments straight to Playwright.

```bash
make e2e E2E_ARGS='--project=chromium --grep "ログイン"'
```

`E2E_PORT` changes the port the application listens on (default `3100`). Specifying a port something is
already listening on fails before the run — if the startup wait were satisfied by reaching someone else's
server, the tests would run against it.

**The listening address is narrowed to the single route the container uses to reach it.** This startup
uses `APP_ENV=ci`, where the test-only session issuing endpoint is open (see below). Listening on every
interface would let other hosts on the same LAN hit that endpoint. The address is resolved by `make e2e`
(the host's loopback on Docker Desktop, the bridge gateway on Linux). To set it explicitly, pass
`E2E_HOSTNAME`.

### Opening failed screens locally

A PR comment for differing pixels carries **one line that opens the failed screens as they are**. Paste it
into another terminal.

**The retake comment carries the same line.** It lists only **the screens whose pixels actually moved**,
and the retake scope is the same set (the same treatment as the story-level side —
[`vrt/README.md`](../vrt/README.md)).

```bash
make e2e-review BRANCH=<branch> RUN=<run-id> E2E_ONLY=<screen-name>,<screen-name>
```

| Item | Value |
| --- | --- |
| `BRANCH` | The branch to look at. **Required** |
| `E2E_ONLY` | Comma-separated names of the failed screens. **Required** |
| `RUN` | CI run id. When given, downloads that run's `e2e-diff` and serves it on the neighboring port (requires `gh`) |
| `E2E_REVIEW_PORT` | The port the application listens on. Default `3200` (distinct from both `make e2e`'s `3100` and the dev server's `3000`) |

It creates a throwaway working tree at `tmp/review/e2e/<branch>`, aligns it with the tip of
`origin/<branch>`, installs dependencies, **starts a production build**, and lists the URLs of the failed
screens. It does not use the dev server because the baseline images are captured from a production build.
**Your local working tree is not touched**, so it can be called with edits in progress. Stop it with Ctrl-C
when done.

Screens that need a role (screens that declare `signedIn`) redirect to login when opened directly. The URLs
listed are those of the dev session surface with a destination attached, so choosing a role lands you on
the intended screen.

**The working tree remains.** They accumulate in `tmp/review/` with their `node_modules` and production
builds, so clean up with **`make review-clean`** (which also cleans up those created by the story-level
side). Deleting the directories directly leaves registrations without their files in `.git`, so use this
entry point.

This startup also uses `APP_ENV=ci`, so listening is narrowed to loopback (for the reason given above: the
test-only session issuing endpoint is open).

> **It has the same limits as the story-level side ([`vrt/README.md`](../vrt/README.md)).** What you can
> see here is "why it changed", not pixel equality. It renders with your local browser and the host's
> fonts, so it never matched the images CI captured in the first place.

## Maintenance mode runs in a separate startup

`APP_MAINTENANCE_MODE` **applies to every route and needs a restart to switch**
([specification](../docs/spec/route/maintenance/page.function.md)). "Suspended screens" and "non-suspended
screens" cannot coexist within one startup, so `maintenance/` alone has its own configuration
(`playwright.maintenance.config.ts`) and its own startup.

```bash
make e2e-maintenance   # 止めた状態で起動し、3 つの応答を確かめる
```

It checks only that the responses hold, and **captures no baseline images**. The maintenance screen's
appearance is captured by the regular run, which opens `/maintenance` — this screen can be opened by URL
even when nothing is suspended.

This also does not use `test` from `lib/test.ts` (the list is in "Specs placed outside the watcher and the
preconditions" below). That one counts server-side 5xx as anomalies, but a 503 during suspension is the
intended response, so under the watcher success would show up as failure.

## The indexable side runs in a separate build

`SITE_INDEXABLE` is **read at build time and baked into the metadata of statically rendered screens and
into `robots.txt`** (`src/config/site/site.server.ts`). The regular run builds with the default (`off` =
not indexable), so the public surface of the indexable side does not exist in that build. `metadata/`
alone has its own configuration (`playwright.metadata.config.ts`) and its own startup that passes
`SITE_INDEXABLE=on` from the build.

```bash
make e2e-metadata   # 索引させる設定で build して起動し、公開面を読む
```

It checks only the responses crawlers read, and **captures no baseline images**. It verifies that
`robots.txt` allows crawling and announces the sitemap location, that every URL `sitemap.xml` lists exists,
declares itself as its canonical URL and does not refuse indexing, and that the icons and OG images screens
declare come back as pictures. The externally visible origin (`SITE_PUBLIC_ORIGIN`) is given the location
of the app as seen from the container, so the URLs screens declare and the URLs the spec opens have the
same spelling.

The non-indexable side is checked by the regular run (`journeys/metadata.spec.ts`): `robots.txt` refuses
every path, and screens declare `noindex`. Only when both pass can the switch be said to work through
configuration.

It does not use `test` from `lib/test.ts` for the same reason as the suspension check, and also because
that `test` replaces image requests with a single stand-in. What you want to see come back as a picture
cannot be verified once it has been replaced with a picture.

## Islands split out of the initial bundle are captured after they finish rendering

An island split out of the initial load with `next/dynamic` (charts and the like) **places only a frame and
renders later**. Capturing before it arrives records just the frame, and **the frame is the same picture
across consecutive captures**, so Playwright's "capture when the same picture appears twice in a row"
cannot wait for it. Pictures from days it arrived and days it did not alternate into the baseline.

The capturing side has to know what to wait for, so the screen declaration
([`lib/screens.ts`](lib/screens.ts)) gets, as `settled`, **an element that appears only in the content**.
Pointing at the frame itself is meaningless.

```ts
{ route: "/<route>", name: "<screen-name>", path: "/<URL to open>", settled: "<element that appears only in the content>" }
```

**What waits is the checks that evaluate the whole screen — capture and screen-level a11y.** Journeys wait
for their target before interacting, so they do not need this declaration. a11y waits for the opposite
reason to capture: evaluating before arrival sees the `Suspense` fallback (skeleton) as the screen.
Skeletons often have neither landmarks nor headings, and **it fails in the direction of no violations**, so
a missed wait cannot be seen in the result.

## What to do when it fails

**There are three ways to fail, and each calls for a different next step.** A retake fixes only pixels;
the other two are not fixed by retaking. Retaking while a declaration is missing makes that state the next
truth.

| Failure | Marker | What to do |
| --- | --- | --- |
| A screen declaration is missing | `画面の宣言がありません` | Add the declaration to [`lib/screens.ts`](lib/screens.ts) (see "What to open" below) |
| A journey failed | `✘ … e2e/journeys/…` | Open the trace and pin down the cause. If only one rendering engine fails, it is engine-specific behavior or runtime flakiness |
| Pixels differ | `toHaveScreenshot` / `A snapshot doesn't exist` | Confirm the change is intended, then retake (see "Baseline images go in the same store as story-level ones" below) |

The CI failure comment is also split by these three. **Do not retake until you can say, for each failed
screen, why it changed** (Limitations in [docs/design/vrt.md](../docs/design/vrt.md)).

**No retries** (`retries: 0`). Just as there is no diff that passes by retaking, retrying a journey only
hides an unstable path. A path that fails on only one engine is triaged with the trace
(`retain-on-failure`) into engine-specific behavior or runtime flakiness.

## The app on the host, the browser in the container

Browsers and fonts come from the official Playwright image pinned by digest (`browser_runner` in
[`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml)). Baseline images are unique **by which
image captured them**, not by the environment of whoever captured them
([vrt/README.md](../vrt/README.md#capture-only-inside-the-container)). This image is also the only one that ships
all three rendering engines at matching versions.

**The application, on the other hand, starts on the host.** `node_modules` is resolved for the OS and CPU
it was installed on, so starting `next start` inside the container lacks the Linux native modules. The
image's job is to pin browsers and fonts, not the application's runtime environment.

Startup and teardown are owned by `make e2e`. Playwright's `webServer` cannot start it — `127.0.0.1` seen
from inside the container is the container itself. The app's location as seen from inside the container is
passed as `E2E_BASE_URL`.

**The fetch result cache (`.next/cache/fetch-cache`) is discarded before the build.** Fetches specified
with `cache: "force-cache"` remain there, and in CI the ones created by another branch's build are
restored. Capturing with them left in place makes the picture depend on "what the previous build cached"
rather than on the state of the tree.

## No backend required

It starts with `APP_API_MODE=mock` (`make e2e` uses `APP_ENV=ci`). Against a real backend it would fail
every time the data over there changed, and whether a failure is a regression or the other side's doing
could not be told apart. If the configuration does not point at the mode, it fails before the run
([`playwright.e2e.config.ts`](../playwright.e2e.config.ts)).

**The mock returns the same response to the same request**
([`mocks/stable-responses.ts`](../mocks/stable-responses.ts)). Neither appearance comparison nor content
verification can stand on a mock whose content changes with every call.

**The unit of stability is the request URL.** Changing how a list is fetched (page size, filtering) makes a
different request, and the set of rows changes. When a spec that waits for an element inside a row fails
with no element, suspect a change on the list side first. IDs put in dynamic segments need not exist — the
contract-driven mock answers any ID.

**"Now" is pinned as well** (`CLOCK_FIXED_NOW` / [`src/config/clock`](../src/config/clock)). The seed that
decides responses derives from the request URL, so if a screen that divides by calendar day builds its range
from the real clock, **the URL changes every day and every value on that screen is replaced**. The baseline
image then matches only during the calendar day it was captured, and even after a retake it fails again the
next day. Masking where dates are rendered does not reach it — what is masked is the date display, while
the values born from the seed are scattered across the whole screen.

The real clock is read in `app`. `features` cannot reference `config` (`architecture.ts`), so "now" is
resolved by the composition entry point and passed down as props.

The signed-in state is created through the test-only session issuing endpoint
(`src/app/api/auth/test-session/route.dev.ts`). Authentication is outside the OpenAPI contract and cannot
be faked by mocks generated from the contract. The endpoint opens only on `local` / `ci`; in environments
where it is closed, `signIn` fails — it accepts nothing but the issued state (204). Proceeding without
being able to sign in makes protected-route checks read "redirected to login" as correct.

The endpoint's path **copies** the application-side declaration into
[`lib/dev-session.ts`](lib/dev-session.ts). It is not imported because only the app layer may touch the
internals of features and Route Handlers, and even if the checking side crossed that boundary, eslint's
boundary check looks only at `src/**` ([0021](../docs/adr/0021-frontend-responsibility.md)). **Keep the copy
in one place.** There are several callers (`lib/test.ts` from the browser, `scripts/lighthouse/` from a host
process), and copying separately means that when the path changes, one of them keeps sending the old
spelling. What happens then is "it measures the screen that was redirected to login and goes green"; it
does not turn red. Drift in surface paths is caught by [`lib/screens.ts`](lib/screens.ts), which reconciles
the declarations with the build output.

## Images are replaced

The media origin (`MEDIA_ORIGIN`) is not mocked. Passing it through makes `next/image` optimization fail to
fetch and return 500, and the watcher fires on every screen. Instead, **anything requested as an image**
(`resourceType` of `image`) gets a uniform 1×1 picture ([`lib/test.ts`](lib/test.ts)). It is identified by
being a picture rather than by destination, so paths through the optimizer and paths that bypass it are
treated alike. The origin's destination is not copied in to match, because changing the configured value
would then leave it watching only the old destination.

**The image fetch path is out of scope here.** Behavior when a media origin exists cannot be verified here.

## What counts as an anomaly

The watcher applies to every spec. Having each spec write it would make only the specs that forgot it
"green despite anomalies", and that state would show up in neither results nor appearance.

| Source | Counted | Not counted |
| --- | --- | --- |
| console error | Lines written by JavaScript (React's hydration mismatch is one) | Lines written by the browser itself (narration of subresource fetch failures) |
| Exceptions during rendering | All | — |
| Network | 5xx and transport failures | Aborts (`net::ERR_ABORTED` and the like; the spelling varies by rendering engine) and 4xx |
| CSP violations | All (`securitypolicyviolation`) | — |

**4xx is not counted because it is a designed result of the application.** A nonexistent resource returns
404, an unauthenticated request returns 401. Each is something a spec verifies by name, and if a
cross-cutting watcher failed them uniformly, the very paths you want to verify could not pass. 5xx and
transport failures cannot be designed results, so the watcher owns them rather than individual specs.

The decision is owned by [`lib/browser-errors.ts`](lib/browser-errors.ts). There are two directions of
discrimination.

- **Network aborts are discriminated by text.** Playwright does not pass aborts distinguished from other
  failures, and `errorText` is the only clue left. Relying on text is allowed because **a missed spelling
  produces a false positive (red), not a miss (still green)** — it is allowed only in the direction that
  does not fall into silence. The list is confined to the rendering engines that are run, and grows only
  when an engine is added
- **console lines are discriminated not by text but by whether they carry arguments.** `console.error(...)`
  carries arguments; lines the browser writes itself do not. Counting the browser's own lines would count
  the same event already judged on the network side twice, and the 4xx excluded there would come back
  through the back door

**The watcher's verdict is placed after the screen's verification passes.** Looking first would bury the
failure you wanted to verify under anomaly reports. The failure text leads with the path (console /
exception / network / CSP) — the same symptom needs fixing in different places.

**CSP violations are not caught by the console watcher.** They are lines the browser writes itself, carry no
arguments, and are excluded by the rule above. They are received via the document's
`securitypolicyviolation` and counted as a separate path. The subscription has to be re-established per
document, so it goes in an init script (`addInitScript`) and is passed to the Node side with
`exposeBinding` (the event itself cannot be taken out of the browser, so only the fields needed to point at
the place to fix are read out). One spec is written outside the watcher —
[`journeys/csp.spec.ts`](journeys/csp.spec.ts) inserts an undeclared origin itself to verify that the
violation is reported, so inside the watcher it would fail on the very violation it verified.

## Consent starts already chosen

The consent surface covers the screen until a choice is made.
[`lib/test.ts`](lib/test.ts) hands the spec a state where **the refusal side has been chosen**. Journeys want
to verify the screens beyond it, and if every spec had to press consent first, only the specs that forgot
would be "green while covered by the surface". It starts from refusal rather than consent because
consenting hands out a measurement id, and every journey would carry a cookie unrelated to its subject.

**This state is not a convenience of `lib/test.ts` but a precondition of every spec that looks at
screens.** A spec that cannot use `lib/test.ts` for another reason creates the same state itself —
[`maintenance/stopped.spec.ts`](maintenance/stopped.spec.ts) verifies a 503 as the intended response and so
cannot sit inside the watcher, but the maintenance screen also passes through the layout shell, so it is
covered just the same. Without the state, the surface sets its surroundings to `aria-hidden`, and queries
by role come back empty.

**Only specs that look at the consent surface itself do not create the state.**
[`journeys/consent.spec.ts`](journeys/consent.spec.ts) verifies the state before a choice, so it uses
Playwright's `test` directly rather than `lib/test.ts`. Like the CSP spec, but it is the side that **cannot
sit inside the preconditions**, not the side that cannot sit inside the watcher.

### Specs placed outside the watcher and the preconditions

`test` in `lib/test.ts` stacks the watcher (anomaly detection) and the preconditions (consent already
chosen, image replacement) together. **Only specs that cannot verify what they want to verify inside it may
be placed outside**, and each uses Playwright's `test` directly and points at the relevant section of this
README at the top.

| spec | What it leaves out | Why it cannot sit inside |
| --- | --- | --- |
| CSP enforcement | Watcher | It inserts an undeclared origin itself to verify that the violation is reported |
| Consent surface | Preconditions | It verifies the state before a choice |
| Service suspension | Watcher | A 503 is the intended response. It creates the precondition side (the consent state) itself |
| Public surface (indexable side) | Watcher, preconditions | What you want to see come back as a picture cannot be verified once replaced with a picture. It opens responses, not screens, so it needs no watcher either |

### The tag-manager-loading branch is not exercised here

The container ID in `env/.env.ci` is empty. So **the branch that adds the origin to `script-src` and lowers
`Cross-Origin-Embedder-Policy` is never taken, neither in e2e nor in DAST**.

**This is a choice to keep CI from hitting Google.** Here images are replaced and the API is mocked so that
external state cannot turn things red. A spec that hits a real container would make it the only one
breaking that principle, mixing external availability and changes to the container's contents into CI's
color.

**What covers it instead**: header assembly is verified for both deployments by
[`security-headers.test.ts`](../src/config/security-headers/security-headers.test.ts), and the loading
strategy is pinned by
[`analytics.test.tsx`](../src/app/analytics.test.tsx). **The only thing not covered is that the assembled
headers take effect as declared in a real browser.**

**Removal condition**: when a way to verify CSP enforcement without going outside is introduced (a check
whose origin can be swapped, for example). At that point, delete this section and add one startup that
declares a container ID.

## Bands and engines come from declarations

**Neither has numbers or brand names written here.**

- **Bands** are fixed at three by [0051](../docs/adr/0051-styling-system.md), and the boundary values are
  held by the design tokens (`tokens/primitives.json`). Capture happens at **the lower edge of each band** —
  since switching happens on `min-width`, that is the first width where the band's styling applies, and if
  anything breaks it breaks there first. Only mobile has no lower edge in the tokens (the lower limit is
  left use-case dependent by [0102](../docs/adr/0102-browser-support.md)), so its upper edge (`md - 1`) is
  captured. Assembled in [`lib/viewports.ts`](lib/viewports.ts)
- **Engines** derive from [0102](../docs/adr/0102-browser-support.md), which adopts Next.js's default
  browserslist (modern browsers). Modern browsers collapse, as implementations, into three rendering
  engines, each corresponding to Playwright's `chromium` / `firefox` / `webkit`. **Only those three are
  checked; neither browser brands nor versions are.** The version is decided by the image. Declared in
  [`lib/browsers.ts`](lib/browsers.ts)

Appearance is captured on one engine only; the other two check **that things hold, not how they look**.
Why it is narrowed to one, and which engine was chosen, are owned by `SHOT_ENGINE` in
[`lib/browsers.ts`](lib/browsers.ts).

What matters when deriving from declarations.

- **`rem` converts to px with a root font-size of 16px.** It is the CSS initial value and holds unless the
  `font-size` of `html` is overridden. Overriding it moves Tailwind's breakpoints too, so whoever overrides
  it also moves this. Only `rem` and `px` are accepted; other units are not values comparable as viewport
  widths and are rejected
- **Only width decides the band.** Height is aligned with story-level capture, and screens are captured
  whole, so anything that does not fit extends vertically
- **The mapping from engines to Playwright device names is also owned by the declaration side
  (`lib/browsers.ts`), and a test reconciles it with each device's `defaultBrowserType`.** It is not put in
  the configuration file because a mix-up would leave the run green — if the project name is `firefox` but
  the device passed belongs to another engine, results from another engine are reported under that name,
  and what cross browser was meant to check disappears right there. A misspelled engine also passes the
  project declaration and fails only at runtime, so the test also pins that it is a name Playwright can launch

## Screen-level a11y runs axe twice

Landmarks, `main` and h1 (`region` / `landmark-one-main` / `page-has-heading-one`) carry only the
`best-practice` tag in axe and do not run under the conformance target's tag set. **As long as the scope is
declared by tags, they stay unevaluated even when you think they are enabled**, so these three are named by
rule and run separately (`SCREEN_ONLY_RULES` in [`lib/a11y-rules.ts`](lib/a11y-rules.ts)). Putting a rule
that runs by tag into this list makes the same violation appear twice, and dropping a rule that does not
run by tag from this list silently restores the never-evaluated state — a test verifies both against axe's
registry. The served-document level (`html-has-lang` / `document-title`) is `wcag2a` and runs on the tag
side; the difference from stories is not the rules but the document that is evaluated.

**The conformance target, and the cancellation of rules enabled as a side effect of tag selection, are
borrowed directly from the story side (`vrt/lib/a11y-rules.ts`).** The target is one decision; with a
different level per check point, nobody could tell which is correct. No neutral location is created — with
two borrowers, setting up a shared container is not worth the cost; revisit when a third check point appears.

**Declarations of rules excluded for named screens are held only by `lib/`, and specs are not allowed to
write `rules`** — otherwise whoever added a screen could silence it on the spot. Only things caused by an
upstream implementation that cannot be removed, and that are in fact unreachable, may be declared, and each
declaration holds a reason, a removal condition and the target screens. **"It cannot be fixed right now" is
not a reason** — a violation on a screen is removed by fixing the screen. The number of targets is pinned by
a test, and adding one means updating that number. The need to update it puts the fact of adding a
disablement into the diff.

What matters in the evaluation procedure.

- **Transitions and animations are stopped before evaluation.** Colors exist mid-transition too, and when a
  component with `transition-colors` changes state, a color that is neither before nor after can be read as
  the computed value until it finishes. `color-contrast` measures that value, so running without stopping
  fails on colors the design never had, and the same screen sometimes fails and sometimes does not. On the
  capture side Playwright does the same thing itself, so here it is done explicitly to match
- **It does not wait for the DOM to settle.** A screen that keeps receiving never stops being rewritten, and
  waiting always times out. Only motion is stopped; which state is measured is decided by `settled` (above)
- **It runs on one engine.** What it looks at is DOM structure, which does not vary by rendering engine.
  Other engines are excluded at the collection stage (`testIgnore`) rather than with a runtime skip;
  skipping at runtime starts a browser container as many times as it skips
- **Violations are listed as the violations themselves (rule, element), not as counts.** Otherwise whoever
  hits the failure has to open the screen and search again

## What to open

The screens to open are **enumerated from the build output**, and URLs are decided by **per-route
declarations**. Why the list is not held by hand, and that routes without declarations and declarations
that lost their target fail, are owned by the top of [`lib/screens.ts`](lib/screens.ts).

Only screens with **no way to open them** may be excluded. "Not written yet" is not a reason.

A declaration for a screen to open has `route` / `name` / `path`, plus `signedIn` / `mask` / `settled` only
when needed. A route not opened has `route` and `skip` (a reason, and a removal condition under which that
reason disappears).

- **Protected screens are not uncapturable; they are just opened differently.** Opened without a session,
  they redirect to login, and what gets captured is the login screen. `signedIn` declares **down to the
  role** because some paths need more than authentication, and opening with an insufficient role gets sent
  back, again failing to capture the intended screen
- **Exclusion declarations carry a reason and a removal condition.** The same shape exists for the named
  a11y disablements (above) and for paths whose nonexistence is intended (the gate below). It is a shared
  shape so that exclusions do not linger, and a test fails an exclusion without a reason
- **Screen names are limited to lowercase letters, digits and hyphens**
  ([0028](../docs/adr/0028-naming-convention.md)). The effect is not only the naming convention — names go
  straight into baseline image file names and into the table cells CI writes to PRs. In the former,
  separators and `..` escape the path; in the latter, backquotes and square brackets create Markdown.
  Narrowing at the entry point means nothing downstream has to filter again
- **Reading the build output (the mapping table) is placed on the spec side.** If `lib/` read it at module
  load, it would not exist in an unbuilt tree, and `lib/` could not be checked from Vitest
- **Degrading to empty is an exception.** A mapping table that yields no screens, tokens from which no step
  can be read, and an `E2E_ONLY` that matches nothing all fail rather than continuing with zero. Continuing
  with zero would let a run that opens nothing, a run with no bands, and a retake with nothing to capture
  pass green as "no anomalies". The path gate is the same: it first checks that the scan has not degraded
  to empty

### Anything in the picture not determined by the URL becomes a mismatch

The same URL gets the same response ([`mocks/stable-responses.ts`](../mocks/stable-responses.ts)). That is
why the IDs of dynamic segments are pinned in declarations. **Conversely, if a value not determined by the
URL appears in the picture, the baseline image stops matching the moment it changes.** Values derived from
the request time are the typical case; left alone, the screen fails every day after the day it was captured.

**Pinning the browser-side clock does not reach it.** What renders is the server, and the means the
story-level side uses ([`vrt/lib/clock.ts`](../vrt/lib/clock.ts)) replaces only the `Date` inside the page.
There are two means, applied in order from the top.

1. **If the URL can name the condition, do that.** If that decides both response and display, the picture
   can verify the whole screen
2. **If it cannot be named, exclude the places that render the value from capture with `mask`**
   (`Screen.mask` in [`lib/screens.ts`](lib/screens.ts)). **Keep the excluded area to a minimum** — the more
   is covered, the more surface can break unnoticed

If capturing the state users actually land on matters, 1 cannot be used. Such screens stay opened at the
default date, and only the date cells are excluded.

## Baseline images go in the same store as story-level ones

The store (the submodule `baseline/images`) is shared by both kinds of capture, with screen-level confined to
the `screen/` area ([`baseline/`](../baseline/README.md)). It is shared because cleanup and retakes both act
on one store; splitting it would mean holding two sets of the same mechanism.

The retake path is the same too. **The `baseline-retake` label retakes both stories and screens** — with one
store and one approval label, there is no reason to split only the retake in two. The scope is decided the
same way: only the screens reported by E2E's report (artifact `e2e-report`) are retaken. **The reported set
and the retaken set come from the same source** so that pixels the PR comment never showed do not silently
enter the store; on a commit with no E2E report, not a single screen is retaken. Only when the 1:1
correspondence fails does it fall to a full retake — because orphans do not disappear in a narrowed retake.

The relationship between retake and approval is also the same as at the story level — **retaking is not
approval**. Details in [vrt/README.md](../vrt/README.md#retaking-and-approving-are-separate-operations).

What matters on the capturing side.

- **Wait for `document.fonts.ready` before capturing.** Glyphs change the moment a font is swapped, and
  capturing without waiting gives the same screen a different picture every time
- **Pass names to `toHaveScreenshot` as an array (band / file name).** As a single string, Playwright
  sanitizes `/` as part of the file name, and everything lands flat in one level instead of per band
- **The 1:1 correspondence check asks the same question as at the story level** (does what should exist
  exist / are there images left that lost their counterpart), so
  [`baseline/lib/orphans`](../baseline/lib/orphans.ts) is used as is, and this side holds only the part that
  builds the paths that should exist from screens and bands ([`lib/screen-baselines.ts`](lib/screen-baselines.ts)).
  The order of areas must match what is passed to `toHaveScreenshot`; if they disagree, everything surfaces
  as orphans
- **Checking the correspondence once against the store is enough.** Running it in every per-band project
  lists the same failure once per band, so one band is chosen to run it. It does not look during a retake or
  in runs narrowed with `E2E_ONLY` — the set of images that should exist shrinks to the narrowed side, and
  every out-of-scope image surfaces as an orphan

## Structure

| Path | Role |
| --- | --- |
| [`lib/test.ts`](lib/test.ts) | The `test` every spec uses. The anomaly watcher, and the means to create the signed-in state |
| [`lib/browser-errors.ts`](lib/browser-errors.ts) | The decision of what counts as an anomaly |
| [`lib/browsers.ts`](lib/browsers.ts) | Declaration of the rendering engines run and the engine that captures appearance |
| [`lib/viewports.ts`](lib/viewports.ts) | Builds the bands from the design tokens |
| [`lib/screens.ts`](lib/screens.ts) | Reconciles the build output with the declarations and decides which screens to open |
| [`lib/screen-baselines.ts`](lib/screen-baselines.ts) | Builds the paths of the baseline images that should exist from screens and bands |
| [`lib/a11y-rules.ts`](lib/a11y-rules.ts) | The axe rules checked only at screen level, and the declarations of rules excluded for named screens |
| [`lib/public-surface.ts`](lib/public-surface.ts) | Extracts the values to verify from public surface responses (robots / sitemap / screen bodies) |
| [`lib/dev-session.ts`](lib/dev-session.ts) | The path of the session issuing endpoint. A copy of the application-side declaration (one copy only) |
| `journeys/` | Journeys, authentication pre-handling, history, focus, per-band variation, CSP enforcement, cross-origin, the consent surface, the public surface of the non-indexable side. Runs on three engines |
| `visual/` | Screen-level comparison. Runs on one engine, once per band |
| `a11y/` | Screen-level a11y. Runs on one engine |
| `maintenance/` | That service suspension holds. **Runs in a separate startup** (above) |
| `metadata/` | The public surface of the indexable side. **Runs in a separate build** (above) |
| [`../playwright.e2e.config.ts`](../playwright.e2e.config.ts) | Runtime environment and comparison conditions |
| [`../playwright.maintenance.config.ts`](../playwright.maintenance.config.ts) / [`../playwright.metadata.config.ts`](../playwright.metadata.config.ts) | Configuration for the sides that run in a separate startup / separate build. They capture no baseline images, so one engine |
| [`../.makefiles/testing/e2e.mk`](../.makefiles/testing/e2e.mk) | Build, startup, teardown. Per-screen Core Web Vitals (`make lighthouse`) ride on the same startup |

## Paths a spec points at must be real routes

Specs write their destinations as strings, so **a destination that disappears is not caught by type
checking**. The real failure is in E2E, but E2E does not run on every PR because of cost
(`.github/workflows/e2e.yaml`). [`scripts/e2e-routes.gate.test.ts`](../scripts/e2e-routes.gate.test.ts)
fills that gap by reconciling the paths in `*.spec.ts` with the real routes in `src/app`. The gate picks up
only **string literals starting with `/`**, and matches them against routes after dropping the query, the
fragment and any trailing separator ([`scripts/lib/e2e-routes.ts`](../scripts/lib/e2e-routes.ts)). Write
paths as literals.

Paths whose nonexistence is **intended** (`/account`, which checks that protection is decided by prefix alone,
and `/help`, which checks replacement regardless of whether the path exists) are declared to that gate with
a reason. "No screen yet" is not a reason. Declarations no spec points at any more, and declarations whose
screen has since been placed and now exists, are both failed by the gate.

Declarations in `lib/` are not subject to this gate. They have their own check against the build output,
where routes without declarations and declarations without a target both fail ([`lib/screens.ts`](lib/screens.ts)).

<!-- sample:begin -->
## What disappears when the bundled sample is purged

**Only specs whose subject disappears together with the sample disappear.** There are five, all in
`journeys/`.

| spec | Why it disappears |
| --- | --- |
| `journeys/browse` | The transitions it runs through are the sample's screens themselves |
| `journeys/responsive` | No remaining screen has a region permanently placed at the side. The band assembly itself ([`lib/viewports.ts`](lib/viewports.ts)) remains, so it can be written again once such a screen is placed |
| `journeys/overlay` | No screen remains where an overlaid surface conflicts with history |
| `journeys/focus` | No screen with a drawer, modal or menu remains |
| `journeys/not-found` | No screen remains that fetches a single item and receives the absence inside the layout shell |

**Remaining specs must point only at remaining screens.** The specs that check mechanisms (consent, CSP,
cross-origin, public surface, authentication pre-handling) require no sample, so they point at the entry
(`/`), the maintenance screen or login. Whether this holds in the purged tree is checked by the gate above
inside `purge-verify`.

**The entry (`/`) remains after the purge.** The sample's screen occupies it, so it is a deletion target,
but a minimal page for checking operation is placed back at the end of the purge (`SAMPLE_RESTORATIONS` in
`scripts/setup/remove-sample/sample-manifest.ts`). The way back from the not-found surface, the return
destination for requests lacking a role, and the public paths the sitemap lists all point at this path.
<!-- sample:end -->

The run results written to `tmp/e2e/` (traces / HTML report / server logs) are not tracked.

## Related ADRs

- [0021](../docs/adr/0021-frontend-responsibility.md) — the boundary crossed when copying the application-side declaration
- [0028](../docs/adr/0028-naming-convention.md) — the spellings allowed in screen names
- [0043](../docs/adr/0043-middleware-policy.md) — where authentication pre-handling stands
- [0044](../docs/adr/0044-seo-metadata-strategy.md) — conventions for the public surface (metadata / robots / sitemap / icons)
- [0051](../docs/adr/0051-styling-system.md) — the number of bands, and the basis for stopping motion before capture
- [0053](../docs/adr/0053-ui-component-interaction-seam.md) — focus and history of overlaid surfaces
- [0073](../docs/adr/0073-pagination-fetch-boundary.md) — the number of items loaded appearing in the URL
- [0079](../docs/adr/0079-auth-frontend-seam.md) — what the front end owns in authentication
- [0090](../docs/adr/0090-testing-strategy.md) — per-layer responsibilities, and why the counterpart is pinned to a mock
- [0091](../docs/adr/0091-test-verification-methods.md) — the perspectives only a real browser can carry
- [0100](../docs/adr/0100-accessibility-target.md) — the conformance target (WCAG 2.x Level AA)
- [0102](../docs/adr/0102-browser-support.md) — where the rendering engines to run come from
- [0111](../docs/adr/0111-csp-security-headers.md) — CSP enforcement and cross-origin pre-handling
- [0131](../docs/adr/0131-cookie-consent.md) — handling of the consent surface
- [0153](../docs/adr/0153-ci-configuration.md) — the character set allowed on public surfaces

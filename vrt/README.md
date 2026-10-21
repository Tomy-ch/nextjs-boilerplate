---
test-requirement: unit
coverage-exclusions:
  - "vrt/*.spec.ts"
  - "vrt/lib/settle.ts"
---

# vrt

Compares every Storybook story against its baseline image and detects **unintended visual changes**. This file is authoritative for
usage; how the pieces fit together is in [docs/design/vrt.md](../docs/design/vrt.md).

DOM assertions can only say "the class names did not change", which is no guarantee that the appearance did not change.
The main source of regressions is not per-screen changes but touching a design token or the layout shell and moving every screen
at once, so it is caught on the component side.

## Test Responsibilities

The frontmatter `test-requirement: unit` applies to **the decisions in `lib/` that run under Vitest**.
`*.spec.ts` are the main bodies Playwright runs and cannot be called from Vitest, and `visual` in the per-layer responsibility table has no
declaration. Since capture itself cannot be tested standalone, the decisions are split out into `lib/` and made 1:1 targets.

## Usage

```bash
make vrt          # Storybook を build して全 story を比較する
make a11y         # 同じ story 全数に axe を掛ける（後述 "a11y checks ride along with capture"）
make vrt-retake   # 撮り直して置き場へ送る（手元からの撮り直しはこれ）
make vrt-report   # 直前の実行の HTML レポートを開く
make vrt-review   # CI が落とした story を手元で開く（後述 "Opening failed stories locally"）
make review-clean # 見直しで生やした作業ツリーを片付ける
```

`vrt-retake` runs `vrt-update` (capture) and `baseline-push` (send) in order. Either can be called on its own when only one
is needed, but **capturing without sending leaves the parent's gitlink stale**, so a local `make vrt` passes while
only CI fails.

**Only `make baseline-push` sends to the store.** Committing directly inside the submodule chains retakes
together, and pruning can then drop none of them (see below).

`VRT_ARGS` passes arguments straight through to Playwright.

```bash
make vrt VRT_ARGS='--project=light --grep "Action/Button"'
```

## Capture only inside the container

Font rasterisation changes with both the OS and the CPU architecture. A baseline image is unique by
**which image it was captured in**, not by the environment of the person who captured it. So execution is
confined to `browser_runner` in [`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml)
(the official Playwright image, pinned down to its digest and `platform`). Starting
`playwright test` directly on the host fails before any comparison.

CI runs the same `make vrt`. Local runs and CI never disagree on the verdict because both pull the same image.

## Legitimate changes go red first too

What VRT can say stops at "it changed"; whether "the change is acceptable" is decided by a person. So **an intended change
also comes up as a diff first**. This is not a flaw in the mechanism; it is the very form of handing the judgment to a person.

A PR with diffs gets a comment with **a table of which stories moved and by how much**. In addition,
the `vrt-diff` artifact contains the three images (expected / actual / diff) and an HTML report. Having looked at these,

- **if it is a regression, fix the implementation**
- **if it is an intended change, approve it**

### Opening failed stories locally

The comment on a PR with diffs carries **one line that opens the failed stories as they are**. Just paste it into another terminal.

**The retake comment carries the same line too.** What it lists is not the retake's scope but **the targets whose pixels actually
moved**, and it has no `RUN` — after a retake, what you want to see locally is the surfaces rendered by the new set, while
the artifact of the run that captured the comparison is a comparison against the old baseline.

```bash
make vrt-review BRANCH=<branch> RUN=<run-id> VRT_ONLY=<id>,<id>
```

| Field | Value |
| --- | --- |
| `BRANCH` | The branch to look at. **Required** |
| `VRT_ONLY` | The ids of the failed stories, comma-separated. **Required** |
| `RUN` | The CI run id. When given, downloads that run's `vrt-diff` and serves it on the next port (needs `gh`) |
| `VRT_REVIEW_PORT` | The port Storybook listens on. Default `6106` (avoiding the development `6006`). The artifact is served on the next number |

It grows a disposable working tree at `tmp/review/vrt/<branch>`, moves it to the tip of `origin/<branch>`,
installs dependencies, starts Storybook there, and lists the URLs of the failed stories. **Your own working tree does not move**,
so it can be called while you hold uncommitted changes. The ref is held detached, so it does not collide even when another working tree
already has the same branch.

It does not stop if the `RUN` artifact cannot be downloaded — it disappears after its retention period, but what you want to see then is
"how the current branch renders", which can be seen as long as the server starts. If the port is taken, it stops up front,
so pass a free number in that case.

When you are done, stop it with Ctrl-C. **The working tree stays** — so that looking at the same branch again does not require
reinstalling dependencies, and it piles up in `tmp/review/` with its `node_modules`. To clean up, use
**`make review-clean`** (it also cleans up what the per-screen side grew).

```bash
make review-clean
```

**Do not delete the directory directly.** A registration that has lost its files remains in `.git`, and the next
`git worktree add` for the same branch is refused there. `review-clean` removes the git registration first.

> **What you see here is "why it changed", not a pixel match.** The local Storybook renders with the host's
> fonts, so it never matched the images CI captured in the first place (see "Capture only inside the container" above).
> The surface for judging pixels remains the before/after list the retake comment lays out.

### Retaking and approving are separate operations

There are two ways to **retake**.

| | Operation | Where it goes |
| --- | --- | --- |
| `baseline-retake` label | Put the label on the PR | CI retakes, pushes to the store and advances the pointer (on a protected branch it opens a pointer PR) |
| Locally | `make vrt-retake VRT_ONLY=<id>,<id>` / `make e2e-retake E2E_ONLY=<name>,<name>` | Retakes in an environment with Docker. The only option for PRs from forks |

**The label retakes both stories and screens.** There is one store and one approval label, so retakes alone are not split
in two. For both stories and screens ([e2e/README.md](../e2e/README.md)), **only what appeared in the table** is in scope,
and both enter the store as one commit. That is why **this PR's visual changes line up in one comment**,
and that one comment is what the approver looks at.

**The scope is taken from the same source as the report.** For stories, the report the VRT run produced; for screens, the report the E2E run produced;
both are the very report for that commit. Targets not in the report are excluded from the retake
to keep pixels the PR comment did not show from silently entering the store. Only when orphans are reported
does that family fall back to the full set.

**"No report" means two things.** Screen comparison does not run on PRs by default, so the absence of a report does not necessarily mean "no diff";
it can also mean "**nothing was compared at all**". Either way the screens are not retaken, but the latter makes a PR where
only stories were retaken look complete from outside, and the screen baselines enter the release stale (failing in the full run after merge).
**So on a commit where E2E did not run, the retake comment says so** — if the change can move
rendering, rerun with `run-e2e` attached and re-attach `baseline-retake`, and stories and screens line up in a single push.

**Neither is approval.** A retake is only an operation that "puts the pixels into a viewable form". The retaken set is
pushed to the store, and the PR comment gets **a table listing the moved images one by one**. Each row links to the picture before the retake
and the picture after, and **that is where the appearance is judged**. The same comment also carries one line that opens the targets whose pixels moved
locally, but what that shows stops at "why it changed" (see "Opening failed stories locally"
above).

The judgment is expressed with the **`baseline-approve` label**. On a PR whose baseline images move, the `baseline-approval`
check requires it, and without it the PR stays red and cannot be merged. **It goes on the PR that brought in the pointer**,
and a label there remains effective on later PRs that inherit the same pointer (see "On protected branches, the
pointer arrives through a PR" below). PR review approval is not used because it
approves the PR as a whole, not the baseline images — approval resets on unrelated pushes, while
"someone looked at the pixels" is recorded nowhere. **It works even in a one-person repository** (a PR's author cannot
review-approve their own PR).

**A stale approval does not pass.** The check looks not only at whether the label is present but at **whether the label was applied after the last commit that
moved the baseline images**. After a retake runs, `baseline-approve` stays attached, so for the new set
**re-apply it** (remove it once and add it again). Left in place, its time stays old, and the check
prints 「承認 ⟨時刻⟩ / 撮影 ⟨時刻⟩」 and stays red.

**What is listed are links, not the images themselves.** Embedding them would be too long to read, and if the store is private,
**GitHub's image proxy accesses it anonymously and gets a 404** (the viewer's permissions are irrelevant). A link stays
inside GitHub's UI, so the viewer's own authentication applies.

**The store's compare view is not used.** A retake stacks the whole set on top of the store's root, so compare lists
**the whole set as "added"** rather than the few images that moved (see "A retake is 'one commit holding the whole set'" below).
With many images, generating it may not even finish in time, and the page may not open.

**When many images moved, the table is truncated.** The comment states that it was truncated and gives the total. To see everything,
use the line that opens them locally.

Two constraints apply to retakes.

- **Limited to the stories the previous run reported**. The scope is read from the report's JSON, so a diff that did not appear in the table
  never silently enters the baseline images
- **A branch behind its base cannot retake**. What is judged is the tree resulting from merging into the base
  (`refs/pull/N/merge`), so images captured on a lagging head disagree with the tree being judged

**The label is a condition read when VRT completes, not a trigger.** Nothing happens the moment you apply it.
The procedure is as follows.

1. **Apply the label before VRT finishes. Applying it when creating the PR is the most reliable.** Applying it after completion
   does nothing until the next VRT run comes
2. If you forgot and VRT has already finished, apply the label and then **re-run VRT**
   (`gh run rerun <run-id>`). The completion event fires again, and the label is read then
3. **On a run where VRT is green, the label is not consumed and stays attached** (the whole retake job does not run).
   Leaving it attached would automatically retake even unintended visual changes later, so remove it while you have no
   diff planned

The label comes off **only when a retake has pushed to the store and placed the pointer**. When it is skipped because other checks
failed, and when it is refused because the branch is behind its base, the label stays attached. Fix the cause and
push, and the next VRT completion picks it up automatically.

### On protected branches, the pointer arrives through a PR

`release/**` / `hotfix/**` and the per-environment branches require PRs by ruleset, so a retake cannot push the pointer
directly. There, it opens **a PR carrying only the gitlink** (branch `baseline-retake/<PR number>`).
The retake comment carries a link to that PR.

There are two things to do.

1. **Compare the before/after pixels in the retake comment's table, as usual.** The surface for judging does not change
2. If it is an intended change, **apply `baseline-approve` to the pointer PR and merge it.** Merging
   reruns the original PR's comparison, and it turns green

**One approval is enough.** `baseline-approval` looks for the label not only on the current PR but also on the PR that
brought in that pointer commit. The same set does not need to be approved twice.

**Only one pointer PR is ever open.** Both the branch and the PR are named after the target PR number and
reused. Redoing a retake **updates the same PR in place**, so the review thread is not broken, and
unmerged proposals do not pile up in the list. When the PR is closed, the branch goes too.

So that no retake runs during review, `baseline-retake` comes off after a single retake.

> A large volume of diffs (such as after touching a design token) cannot be expected to be looked at one by one by a person. This is
> left as a limit the mechanism cannot close. The count is put at the top of the table so that at least "how many images moved"
> comes at the entrance to the judgment.

## What to Capture

- The target is **every story**. They are enumerated from `storybook-static/index.json`, so adding a story
  silently puts it in scope. If capture targets were self-declared on the story side, newly added stories would remain
  out of scope. The docs pages listed in the inventory are not captured — they consist of restated stories and auto-generated tables, and regressions show
  on the story side
- To exclude one, declare it in [`lib/excluded-stories.ts`](lib/excluded-stories.ts) **with a reason and a removal condition**.
  No state is created where adding one tag line on the story side silences it. A declaration that has lost its target
  (one pointing at a deleted or renamed story) fails
- Only **stories for which capturing has no meaning** can be excluded. Something that renders a different picture on every capture cannot hold a baseline
  image, so the comparison itself does not hold. **"Cannot fix it right now" is not a reason to exclude** —
  that is a regression, and it is either fixed or turned into an issue. The same discipline as the declarations of modules excluded from checks
  ([`scripts/lib/untested-modules.ts`](../scripts/lib/untested-modules.ts))
- What is captured is `SHOT_THEMES` in [`lib/themes.ts`](lib/themes.ts) = **light only**. The light surface is chosen
  because people approve baseline images as images (the judgment is made by opening the picture on GitHub, and that screen itself is
  light). `:root` is light, and dark is also the side that needs an attribute or an OS setting. For the side not captured,
  [only the application of the color theme is checked](#for-the-theme-not-captured-check-only-that-it-applies)
- **It also checks that no baseline image left in the store is unreferenced by any story**. Deleting or renaming a story,
  or declaring an exclusion, leaves images that no comparison touches, and the store's contents drift from reality.
  It is checked only on full runs (on a run narrowed with `VRT_ONLY`, images of out-of-scope stories cannot be told apart from
  orphans). If it fails, retake with `make vrt-retake` or restore the corresponding story.
  **A retake when orphans appear is not narrowed** — a narrowed retake only overwrites what it captured and
  does not remove orphans; only a full retake empties the partition before capturing (`vrt clear-stories` for stories,
  `e2e clear-screens` for screens). **It empties only when no arguments at all are given.** Narrowing happens
  not only through `VRT_ONLY` / `E2E_ONLY` but also through `--grep` / `--project` in `VRT_ARGS` / `E2E_ARGS`,
  so deciding by enumerating which arguments narrow the capture targets would make any argument missing from that enumeration "delete everything
  and retake only part". Unknown arguments fall toward not deleting — deleting and then capturing only part
  loses the baseline images of the stories not captured from the store.
  CI's retake has this decision too, and captures without narrowing when the report contains orphans.
- The viewport is one band by default (1280×720), with a single browser. Adding bands and adding rendering engines
  belongs to **the per-screen side** ([e2e/README.md](../e2e/README.md)). The convention is that components branch on their container's width
  ([`docs/rules.md`](../docs/rules.md#layout) — a component's contents do not branch on the band (viewport)),
  so capturing a component that does not branch on the viewport once per viewport only adds run time. **Only when a story
  declares a viewport** is it captured at those dimensions (see "The capturing side matches the viewport a story declares" below)

### The capturing side matches the viewport a story declares

**Viewport globals do not reach the preview.** Changing the width is done by Storybook's manager shrinking the frame around the iframe,
and the bare `iframe.html` capture opens has no frame. Unless the capturing side
sets Playwright's viewport, a story claiming a narrow width is captured at the default width too, and its baseline image is not one byte different from the default story's.
[`lib/viewport.ts`](lib/viewport.ts) maps the declaration to dimensions.

- **The declaration can only be read after rendering finishes.** Per-story `globals` are not written to the inventory (`index.json`), so
  the only place to read them is the rendered render (`__STORYBOOK_PREVIEW__.storyRenders`). The story store is not touched —
  its getters throw until the index is ready, and Storybook itself discourages direct use
- **After changing the dimensions, reopen** (`setViewportSize` alone is not enough). A component that decides its width from its container decides
  its number of columns at mount, so the shape decided at the first width remains. Only stories with a declaration are opened twice, and after reopening
  it waits for rendering to complete once more
- **If a name cannot be resolved, it fails.** Falling back to the default would give a misspelled story a default-width picture as its baseline
  image, and no later run would notice. For a name not in the built-in list, the definition in that story's
  `parameters.viewport.options` is used if present (the story's own definitions take precedence over the built-ins)
- **Dimensions are read only in px.** Capture requires a pixel count, so `%` and `rem` definitions fail

The a11y check looks at the same width. Some violations appear only at the declared width (names and order of collapsed controls).

## Sources of flakiness are pinned

If the same story produces a different image on every capture, the gate falls either to "red every time" or to "ignore the diff".
The following are pinned.

| Source of flakiness | How it is stopped |
| --- | --- |
| CSS animation / transition | Stopped at capture time (`animations: "disabled"`) |
| Framer Motion (not CSS animation) | Captured in its initial state with `reducedMotion: "reduce"` |
| Late font loading | Waits for `document.fonts.ready` before capturing |
| Text caret | Hidden (`caret: "hide"`) |
| Date and time display | `timezoneId` and `locale` are pinned |
| "Today" as read by the component itself | Only `Date` is pinned before opening ([`lib/clock.ts`](lib/clock.ts)). Timers stay on real time — stopping timers too would capture stories that advance rendering with `setTimeout` in their initial state |
| Page scroll position left by `play` interactions | Returned to the top just before capture ([`lib/settle.ts`](lib/settle.ts)) |
| What arrives after rendering completes (separate `next/dynamic` chunks, late effects) | Waits until the DOM is still ([`lib/settle.ts`](lib/settle.ts)) |
| Lazy image loading | Waits for every `complete` before capturing |
| Rasterisation rounding under parallel execution (measured ±3) | Cut off with a lower bound on color difference (`threshold: 0.02`) |

**Scroll position does not appear in a story's declaration.** Only the viewport is captured, so a different position gives
a different picture even in the same state. Stories with `play` move focus during interaction, and the browser scrolls the page
to show that element. How far it scrolls depends on the document's height at the time of the interaction, so with not one byte of the inputs that decide the picture
changing, whether it scrolled can differ from run to run.

**What Storybook calls "rendering finished" extends only to the first commit.** Contents split with `next/dynamic` arrive late as
a separate chunk (measured 23ms), and meanwhile only the frame is standing. Playwright considers it stable as soon as two consecutive
images match, so losing to this gap makes **a frame-only picture** the settled picture. Run a retake,
and that becomes the baseline image as-is.

**Waiting for stillness works only when what arrives is finite.** If the catalog's mock returns more for an infinitely scrolled list,
every time the end marker comes into view it fetches the next page, and the DOM never goes still. The fix is not the wait time but
the mock, and the rule is owned by [`.storybook/README.md#how-msw-answers`](../.storybook/README.md#how-msw-answers).

### When rendering counts as finished

The waiting is owned in one place by [`lib/settle.ts`](lib/settle.ts), and capture, a11y and the color-scheme check use the same thing.
In order: rendering reached → `play` complete → fonts → scroll position → DOM stillness and images.

- **Rendering reached is detected by the color theme having landed on `:root`.** The theme is applied by the decorator wrapping the story,
  so if it has landed, rendering has reached the story. Detecting by the appearance of an element would treat an empty, pre-render `#storybook-root` as
  "a stable screen"
- **Wait until `play` completes.** Wait while Storybook's phase (`storyRenders[].phase`) still shows `playing`.
  The pre-interaction state also satisfies "two consecutive images match", so without waiting the pre-interaction picture becomes the settled one,
  and a retake burns it in as the baseline image. From then on that story verifies nothing, and as long as the input hash matches
  the comparison is skipped too, so nobody notices
- **Only images within the viewport are waited for.** `loading="lazy"` does not start fetching until the image approaches the screen,
  so `complete` stays false forever for images outside it, and waiting always times out. `complete` is set even on failure
  — what is captured is the result that arrived, not whether it succeeded
- **The side that records the time of changes is separate from the side that judges stillness.** Re-subscribing on every judgment would
  only ever see stillness since "the moment it subscribed"
- **The timeout message differs per stage.** Reading which stage it stopped at (the decorator does not run / `play` does not return /
  the DOM does not go still) tells you what to check in Storybook

**There are three time limits.** The limit for rendering to complete (`settle.ts`) < the limit for capture to settle (the configuration's
`expect.timeout`) < the per-test limit (the configuration's `timeout`). If the rendering limit equalled the per-test limit,
one story that never finishes rendering would use up the whole limit, leaving only "timeout" in the log. The per-test limit is set wider
than the default to tell, under heavy load, "failed from flakiness" apart from "failed waiting in the queue".

**No retries** (`retries: 0`). No diff should be passed through by a retry; retries only hide unstable stories,
and what is hidden accumulates on the baseline side. **Parallelism is pinned in the configuration** — the default is half the logical cores and varies with
where it runs, and the measured fluctuation above is a function of parallelism.

There is no tolerance on **pixel count** (`maxDiffPixels: 0`). What is counted is **only pixels whose per-pixel color difference exceeds
`threshold`**, so that is where the tolerance actually lives. Playwright sets the YIQ distance limit to
`35215 × threshold²`, and in grayscale differences up to `264 × threshold` pass as zero pixels.

The default `0.2` gives a limit of 52.8, so even confusing `neutral-400` with `neutral-500` (a difference of 48) stays green.
Low-contrast regressions would slip through here, so `0.02` (a limit of 5.28) is set. Every difference beyond this width
is counted.

**The lower bound is placed at 5.28 because the measured fluctuation reaches that far.** Running every story on 4 workers,
**places where an arc is painted with anti-aliasing, such as rounded corners**, move from run to run. In an example measured on a card's corner, expected and actual
differed by 8 pixels, at most `207,239,242` → `210,242,245` (+3 on every channel). Running the same run twice
produces byte-identical pictures, so the fluctuation is between runs.

**A retake cannot fill this gap.** A retake only makes the arc painted at that time the truth, and if the next run
paints differently it is off by the same amount again. The only option is to cut it off at the lower bound.

**Even when the comparison is silent, the bytes move.** What the lower bound cuts off is the judgment, not the rendering, so a fluctuating image
passes as "0 diff pixels" while being captured as a different byte sequence. In the four measured images, only
**the anti-aliasing of arcs** moved, such as a slider thumb's arc or the rounding of `必須` (the "required" badge), within a 15 × 8 pixel area with a maximum difference of 2, and the comparison passed for both versions.
In other words, **this is not non-determinism that can be squashed on the story side** — what would have to be squashed is the arc itself.

So what is guarded is the capturing side: **retakes are limited to the reported set** ([`../baseline/README.md`](../baseline/README.md)).
Re-placing images not in the report would let this fluctuation silently become the baseline, and the approver would pass unexplained rows
as "probably fine". Only branches starting with `revert-` capture the full set, since that is where the whole set
being reverted to is taken wholesale.

## For the theme not captured, check only that it applies

Capturing every story in two themes doubles the run. Because it is billed on private runners
(2 cores), the run is not doubled here. Only light is captured, and **for dark, only that the color theme takes effect on surfaces**
is checked ([`theme-tokens.spec.ts`](theme-tokens.spec.ts)).

What is lost is dark-specific visual regressions — components that break only on dark surfaces, and low contrast that appears only on dark surfaces.
What continues to be caught is the "dark color scheme broke entirely" class.

Other kinds of breakage are already owned by other checks, so they are not checked here.

| Kind of breakage | Who catches it |
| --- | --- |
| The SSOT and the generated artifacts drift (wrong values, missed generation) | `tokens-drift` (`pnpm check:tokens`) |
| The generated CSS is not read at all | Capturing every light story (the whole set moves) |
| Only the application path of the theme not captured breaks | Here |

It holds no values itself. `tokens-drift` covers the path from the SSOT to the generated artifacts, so holding values here would hold the same table
in two places. What it reads is only **that switching changes things**, on both the color-scheme axis (`data-theme` on `:root`) and
the family axis (`data-surface` on a subtree, [`tokens/README.md`](../tokens/README.md)).

| Axis | What is checked |
| --- | --- |
| Color scheme | `color-scheme` matches the project name. Switching to the other theme does not leave the color table entirely the same |
| Family | In a subtree carrying the family, the colors change. **Things other than color (typeface, weight, shadow) change too** — looking only at color would let through breakage that reaches only that family, such as a place that reads a typeface alias directly from hand-written CSS |

Not everything has to differ. The verdict is that if the table is entirely the same, the switch is not working. Any story can serve as
the probe (the first capture target); what is checked is not the story's contents but whether the color scheme lands on the surface wrapping the story.

The token names, and the names of families declared besides the default, are extracted from the generated CSS by
[`lib/theme-tokens.ts`](lib/theme-tokens.ts). Families come and go with the directories under `tokens/themes/`,
so the spec does not hold their spelling. If no family is declared, the family check is skipped.

- **What is read is the name of the real variable (`--semantic-*`), not the alias (`--color-*`).** `@theme inline` resolves aliases once at `:root`,
  so they are not re-resolved in a subtree with a switched family. Reading an alias makes the value look unchanged even when
  the rebinding has arrived
- **What is read is the result of using the variable (`getComputedStyle`), not the declaration.** Read as declared, some browsers return
  `var(...)` as an unresolved string
- **For things other than color, the property to read the value from is attached per type** (`font-family` for typefaces, `box-shadow` for shadows). The property
  to read differs by type, so the name alone is not enough to read it

> Tokens are read on two surfaces that inherit different colors. A declaration using a custom property with no declaration becomes invalid at computed-value time,
> and that property falls back to its **inherited value**. The inherited value also reads as a color, so a single surface cannot distinguish a color that arrived from an inherited
> one. If it arrived, the same color comes back whatever the inheritance source.

## a11y checks ride along with capture

`make a11y` runs [`a11y.spec.ts`](a11y.spec.ts) in the same container, with the same story enumeration, the same exclusions, the same
viewport and the same theme as capture, and applies axe. It is the path that satisfies "make automated a11y checks work on stories"
without adding another runner, and **a real browser is essential** — jsdom has neither rendering nor color computation, and color contrast
only appears in real rendering. The policy (the scope of the checks and the conditions for disabling) is owned by [0091](../docs/adr/0091-test-verification-methods.md)'s
decision on building in automated a11y checks; this file describes only the mechanism. The declarations live in [`lib/a11y-rules.ts`](lib/a11y-rules.ts).

**The scope is the conformance target mapped onto axe tags** (`CONFORMANCE_TAGS`). By default axe also runs beyond the target (`best-practice`
and so on), so without the declaration every story would be evaluated against a level that is not claimed. To raise the target,
change [0100](../docs/adr/0100-accessibility-target.md) first.

**Declaring the scope by tags also runs rules axe disables by default.** axe enables whatever matches the tags regardless of the default
setting, so a declaration that narrows the scope simultaneously adds other rules. A declaration cancels that increment
(`DEFAULT_OFF_RULES`), keeping **the set of rules that run from growing between before and after the tag declaration**. Excess or shortfall is detected by
[the test](lib/a11y-rules.test.ts), which reconciles against axe's own inventory, so when you decide to run a rule,
the procedure is to remove it from this declaration.

Disabling declarations come in three levels, each **with a reason and a removal condition** (see "Declaration Format" below).

| Declaration | Scope | What may be placed there |
| --- | --- | --- |
| `DEFAULT_OFF_RULES` | Every story | Only cancellations of the tag declaration's side effects |
| `DISABLED_RULES` | Every story | Only what fires as a side effect of a story rendering a component standalone |
| `STORY_DISABLED_RULES` | Named stories | Caused by an upstream implementation that cannot be removed, and not actually reachable. The same rule stays live for other stories |

Landmarks, `main`, h1 and the like are not disabled here. They cannot hold while a component is rendered standalone and only break
on assembled screens, so the per-screen check ([e2e/README.md](../e2e/README.md)) owns them. The spec side does not get a form where
`rules: { ... }` can be written — that would let whoever added a story silence it on the spot.

**The addon's automatic check is stopped via the URL.** `@storybook/addon-a11y` runs axe every time it renders a story, so
unless stopped, axe runs twice per story. For capture it is pure waste, and for the check it collides with its own run
(axe refuses concurrent execution). `globals` (`a11y.manual:!true`) is chosen as the way to stop it because **it affects only this run**;
stopping it with a parameter in `.storybook/preview.tsx` would also remove the check for people who open Storybook.

**Violations fail with their contents, not a count** (rule id, description, element). Just as a timeout does not tell the cause,
a count alone sends the reader to open Storybook and search again.

**The a11y spec is not mixed into the `make vrt` run.** If it were, a11y failures would enter the retake scope, and the baseline images alone
would become approved while the failures stay unfixed by the retake. The color-scheme check (`theme-tokens.spec.ts`) rides in the same run as capture —
it has no baseline images, so it never enters the retake scope, and the surface it looks at is the same as capture.

## A broken story does not pass as "unchanged"

**Exceptions that leak to the page are checked before the image.** Even a story that threw an exception produces an image, and that may
not show up as a diff. Both capture and a11y collect `pageerror` and check that it is empty before capturing and before applying axe.
For a11y, a broken story times out because the waiting never settles, but a timeout does not tell the cause — so the exception itself
is reported. **Only exceptions that leaked outside React's boundary reach `pageerror`**; exceptions during rendering are caught by
the boundary that catches story exceptions ([`.storybook/README.md#previewtsx`](../.storybook/README.md#previewtsx)) and do not
leak to the page. **So the boundary's screen itself is checked too.** The boundary sets `data-story-error`, so both capture and a11y
confirm, before capturing and before applying axe, that none exists, and if one does they fail with its message. Without this, the boundary's screen would be
approved as a baseline image, and axe would check the boundary's screen instead of the component.

**A failed story is reported by id.** The test is annotated with the story id, and the approval path narrows the scope with it.
It is never looked up in reverse from the title string.

## An empty set is an error, not green

**Collapsing "not a single target" into zero items lets an unchecked state pass green as "no diff".** Every entry point in `lib/`
fails on empty.

| When it becomes empty | Why it fails |
| --- | --- |
| The inventory has no `entries` / not a single story | A state with no capture targets would pass green |
| Exclusion declarations emptied the capture targets | Same as above |
| No story matches `VRT_ONLY` | A misspelled retake would pass as "no diff", and the images you believed you approved would not be updated |
| The generated CSS has not a single semantic token | A state with nothing to check would pass as "everything arrives" |

## Declaration Format

Stories excluded from comparison ([`lib/excluded-stories.ts`](lib/excluded-stories.ts)) and disabled axe rules
([`lib/a11y-rules.ts`](lib/a11y-rules.ts)) are held in the same shape.

- **Each entry is `id` / `reason` / `removeWhen`.** A declaration with an empty reason or removal condition fails [the test](lib/excluded-stories.test.ts).
  A duplicate declaration for the same target fails too
- **The count is baked into the test.** Adding a declaration means updating the number in the test, and the very need to update puts the fact of exclusion
  into the diff. Only the cancellations of the tag declaration are reconciled against axe's inventory instead of a count (see above)
- **A declaration that has lost its target fails.** A declaration pointing at a deleted or renamed story silences nothing, so no violation
  reveals it, and it squats there hitting nothing. What it is reconciled against is the set **after exclusions are subtracted and before narrowing with `VRT_ONLY`** —
  a declaration pointing at an excluded story never runs under axe, so the inventory's presence check cannot find it, and after narrowing, declarations pointing at stories
  not run would also look like squatters

## Do not capture when the picture cannot have changed

The skip decision has **two layers**. Each works independently, and one skipping does not change the other's decision.

| Layer | What it asks | What it drops | What it decides from | Implementation |
| --- | --- | --- | --- | --- |
| CI entry point | Can the PR's diff reach the picture? | Every step of the job, including installing dependencies and the build | The list of changed paths | [`.github/actions/diff-scope`](../.github/actions/diff-scope/action.yaml) |
| `make vrt` / `make a11y` | Are the inputs that decide the picture the same as before? | Only the comparison (the axe run) | A hash of the inputs' **contents** | [`scripts/vrt/render-hash.ts`](../scripts/vrt/render-hash.ts) |

What the upper layer passes over as "cannot reach" is **only documentation and AI agent configuration** (the list lives in
`ignore:` in [`vrt.yaml`](../.github/workflows/vrt.yaml) / [`a11y.yaml`](../.github/workflows/a11y.yaml)). `*.css` / `tokens/*` / `.storybook/*` / `*.stories.tsx` all change the picture and cannot be excluded —
`bundle-budget` excludes them only because what it measures is the size of `.js`, so read that list
as a separate thing ([`.github/workflows/README.md`](../.github/workflows/README.md)).

What follows concerns the lower layer. The comparison covers 623 stories and takes almost all of the run time. **If the inputs that decide the picture are the same as at
the last verdict, capturing can only produce the same picture**, so the comparison itself is skipped. `make a11y` uses the same
decision ([`a11y.spec.ts`](a11y.spec.ts) produces the same violations from the same inputs).

The inputs are folded into one hash by [`scripts/vrt/render-hash.ts`](../scripts/vrt/render-hash.ts).

| Input | What it includes |
| --- | --- |
| `storybook-static/` | The capture target itself. Stories, components, design tokens and CSS are all folded in here |
| `playwright.config.ts` | Viewport / theme / timezone / locale / comparison conditions |
| `vrt/**/*.ts` | How capture works (how it waits, the pinned clock, narrowing the capture targets) and the a11y check |
| `docker-compose.dev-tools.yml` | The digest of the image that decides font rasterisation |
| `pnpm-lock.yaml` | The versions of Playwright and axe. The container only mounts the repository, so both come from `node_modules`, not from the image |

Only `storybook-static/project.json` changes on every build (telemetry metadata, irrelevant to rendering),
so it is excluded. The baseline images themselves are outputs, not inputs, so they are not included either.

### There are two kinds of record

| Record | Meaning | Written by | Location |
| --- | --- | --- | --- |
| `render-inputs.sha256` | **Baseline images were captured** with these inputs | `make vrt-update` | The store (the same commit as the images) |
| `tmp/vrt/verified-inputs.sha256` | **The comparison passed** with these inputs | `make vrt` (`make vrt-record-verified` on a sharded run) | Untracked. CI carries it around in a cache |
| `tmp/a11y/verified-inputs.sha256` | **axe passed** with these inputs | `make a11y` | Same as above |

The capture-time record alone is not enough. A change that does not alter the picture (a refactor, a hidden prop, a comment) still
moves the bytes of `storybook-static`, so it drifts from the record, the comparison runs green, but no retake happens, so
the record is left behind. The pass-time record advances on every run, so the window of matches does not close.

The capture-time value is written **right after capturing** (`make vrt-update`). Writing it on the sending side would let even a tree where the store
was merely fixed without capturing record "captured with these inputs", and the next run would skip the comparison. For the same reason the pass-time value
is written only **after passing**.

`vrt` skips if either of the two records matches. `a11y` looks only at its own record — reusing the capture-time record
would mean that if a retake happened in an input state where axe fails, it would from then on read that state as a "match" and report
green.

**When it cannot decide, it does not skip.** No record, a run whose scope is narrowed with `VRT_ONLY`, and a state where even one input
cannot be read all fall toward checking.

Even on a skipped run, **the one-to-one correspondence between baseline images and capture targets is still checked** (the `@baselines` tag). What is skipped is
the pixel comparison, not the store's consistency.

When CI splits capture across several machines, **only the first machine** carries this correspondence check. What it counts against is the store's
files and the full story inventory, not the tests that ran in that run, so repeating it per machine
only produces the same answer. The pass-time record is emitted by the first machine for the same reason, but **whether to keep it in the cache is
decided by the side that knows every machine's result** (the `vrt` job in `vrt.yaml`). Keeping it inside a machine would
record as "passed" the inputs of a run where another machine was red.

Whether it skipped or ran is printed as one line, `vrt-gate: skip` / `vrt-gate: run`. CI's report text reads it to
distinguish "checked and passed" from "not looked at because it is the same as before".

> The decision uses a hash of the contents rather than a list of paths because this repository's design has several paths by which
> the picture changes without touching `.tsx` (the design token SSOT, `foundation/*.css`, dependency updates,
> image digests). Narrowing by path would silently stop capturing whatever path leaked. The upper layer can narrow by path only
> because the list it passes is limited to **paths that include not a single path that draws the picture**; the moment anything doubtful is added,
> this danger comes in.

## Baseline images live in a separate repository

`screenshots` is a **submodule**; its contents live in a separate repository that holds only baseline images (hereafter "the store").
Its contents are `<family>/<theme>/<story id>.png`, where the family is the first segment of the story's title
(`Action` / `Features` / `Page` …).

The store is **shared with per-screen capture** ([e2e/README.md](../e2e/README.md)). That side is confined to the `screen/`
partition, and a story family claiming that name fails
([`baseline/`](../baseline/README.md)). It is shared because pruning and retakes both work on a single
store; separating them would mean holding two copies of the same mechanism.

It is split by family so that **the unit of deletion can be a family**. Subject-specific families (`Features` /
`Page`) become entirely unnecessary and need to be droppable without listing images one by one. It is also easier to navigate than
thousands of images laid out flat. The family name is the title's first segment in lowercase, with spaces joined by `-`
([`lib/story-index.ts`](lib/story-index.ts)).

**The name is passed to `toHaveScreenshot` as an array of three segments.** As a single string, Playwright sanitises `/` as part of a file name,
and everything is laid flat in one level instead of split by family. The configuration's `snapshotPathTemplate` only receives `{arg}`,
and the spec assembles the segments. The side that counts the images that should exist ([`lib/expected-baselines.ts`](lib/expected-baselines.ts))
must assemble the same three segments in the same order; if they disagree, every image comes up as an orphan.

What to drop is owned by [the declaration of what the purge deletes](../scripts/setup/remove-sample/sample-manifest.ts). <!-- sample:line -->

It is separated because of PNG. PNGs are already compressed, so neither git's delta nor zlib helps, and each update piles up
almost a whole image's worth **forever**. Touching a design token moves the whole set, so keeping them in the same repository
would make cloning the main repository unusable within months.

The store is **just a store**, with no workflows, rulesets or labels. Updates and pruning are all fed in from the main repository's
make targets and workflows.

### A retake is "one commit holding the whole set"

Each retake adds to the store **one commit whose tree holds the whole set**. Its parent is always the store's root
(the README-only commit), and retakes are never chained together.

- Chaining would make an old set an ancestor of a new set, and pruning could drop none of them
- **This shape cannot be read with GitHub's compare.** The common ancestor is the root, so instead of the few images that moved, the whole
  set is listed as "added". Showing the moved images is the retake comment's job

PNGs with identical contents are shared by git as blobs, so a full set's worth of data is not added every time.

### Pruning

Only the sets pointed at by live refs (the tips of `production` / `staging` / `develop` / `release/*` / `hotfix/*`, recent tags, and
the heads of open PRs) are kept; everything else is deleted. **The premise is that going back to past commits does not give a complete set of baseline images.**

| | |
| --- | --- |
| Report | [`baseline-prune.yaml`](../.github/workflows/baseline-prune.yaml) measures monthly and opens an issue only when a threshold is exceeded |
| Execution | `make baseline-prune` (`DRY_RUN=1` for the list only) |

Execution is left to a person because what is deleted cannot be restored. The retention conditions live in
[`scripts/baseline-store/retention.ts`](../scripts/baseline-store/retention.ts) with reasons and removal conditions.

After a revert, the set being reverted to may already have been pruned. So
on branches starting with `revert-`, a retake runs without the label. A revert is by definition an operation that "returns to a previously approved
state", so automating it does not break what approval means.

### Setting up the store

**Have your own store.** You cannot push to the upstream store.

```bash
make setup-baseline-store   # 置き場を作る / 既存を指定する → サブモジュールを張り直す
make setup-baseline-app      # 撮り直しに使う GitHub App を secret へ登録する
```

Only creating the GitHub App and generating its key cannot be automated (REST has no endpoint for creation, and the key is shown only
once when generated). Restrict the App's installation to **only two repositories, the main one and the store**, and give it two permissions:
**Contents: Read and write** and **Pull requests: Read and write**. Do not put a ruleset on the store
— it would block the retake's own push.

`Pull requests` is needed because on protected branches the pointer arrives through a PR (see "On protected branches, the pointer arrives through a PR"
above). **Permissions added later do not take effect until approved on the installation side** — changing the App's settings alone is not enough;
approve the new permissions at `https://github.com/settings/installations/<id>`. Without approval,
issuing a token itself fails with `422 The permissions requested are not granted to this installation.`

The store's visibility defaults to `private`. **When private, `vrt` fails on PRs from outside (forks)**
(fork PRs receive no secrets and cannot obtain the token that reads the baseline images). If you accept outside PRs, make it `public`.

Running it when already wired re-points it. Moving organisations or renaming the repository is handled by the same command.

> If you are going to purge the sample, it is best to **purge it first**. The purge does not reach inside the submodule,
> so in the reverse order the subject's baseline images end up in your own store (they remain in the upstream store, but the reference
> is cut once you re-point).

## What to Change When Adopting

| What | Default | Where to change it |
| --- | --- | --- |
| The baseline image store, and CI's credentials for writing to it | The submodule points at this repository's store, which you cannot write to | [Setting up the store](#setting-up-the-store). The steps and the ordering relative to the purge are owned there |
| Color scheme captured | Only the default color scheme is captured; for the other, only that it takes effect on surfaces is checked | `lib/themes.ts`. A decision to pay double the run time ([above](#for-the-theme-not-captured-check-only-that-it-applies)) |
| Capture targets | Every story. The family is decided by the first segment of the story's title | Not declared. Subject-specific families drop entirely with the purge |

**Retakes do not pass until you have your own store.** This is the first place you get stuck.

## Structure

| Path | Role |
| --- | --- |
| [`stories.spec.ts`](stories.spec.ts) | The main body that enumerates stories and captures them one by one |
| [`a11y.spec.ts`](a11y.spec.ts) | The main body that applies axe one by one with the same enumeration (`make a11y`) |
| [`lib/story-index.ts`](lib/story-index.ts) | Extracts capture targets from the inventory, builds story URLs, and decides family names |
| [`lib/excluded-stories.ts`](lib/excluded-stories.ts) | Declarations of stories excluded from comparison (with reasons and removal conditions) |
| [`lib/a11y-rules.ts`](lib/a11y-rules.ts) | Declarations of the scope checked (conformance target tags) and of disabled axe rules |
| [`lib/settle.ts`](lib/settle.ts) | Waits for rendering, `play`, fonts and DOM stillness (shared by the three specs) |
| [`lib/viewport.ts`](lib/viewport.ts) | Reads the viewport a story declared and reopens at those dimensions |
| [`lib/themes.ts`](lib/themes.ts) | Declares the color themes that exist and which of them every story is captured in |
| [`theme-tokens.spec.ts`](theme-tokens.spec.ts) | Checks that color themes and families take effect on surfaces (the catch for the theme not captured) |
| [`lib/theme-tokens.ts`](lib/theme-tokens.ts) | Extracts semantic token names from the generated CSS |
| [`lib/clock.ts`](lib/clock.ts) | The time read as "today" during capture |
| [`lib/expected-baselines.ts`](lib/expected-baselines.ts) | Counts the story baseline images that should exist in the store |
| [`lib/static-server.ts`](lib/static-server.ts) | A dependency-free static server that serves the built Storybook |
| [`../baseline/lib/`](../baseline/lib/) | The store's partitioning and the correspondence reconciliation. Shared with per-screen capture |
| `../baseline/images/` | The baseline image store (submodule) |
| `../playwright.config.ts` | Execution environment and comparison conditions |
| `../scripts/vrt/` | Extracts the table and the retake scope from run results, and hashes the inputs that decide the picture |
| [`../scripts/baseline-store/`](../scripts/baseline-store/) | The store's ref names, and computing what pruning deletes |
| [`../.github/actions/setup-baselines`](../.github/actions/setup-baselines/action.yaml) | Fetches only the recorded commit in CI |
| [`../.github/actions/diff-scope`](../.github/actions/diff-scope/action.yaml) | At CI's entry point, decides whether the diff can reach the picture |

The run results written to `tmp/vrt/` (actual / diff / HTML report) are not tracked. Diff images are emitted with the same extension
as baseline images, so tracking them would make them indistinguishable from "updated baseline images".

**Storybook cannot be opened over `file://`.** Its entry is a module script, and browsers reject modules from `file://` as
having no origin. So a static server using only standard modules is started per worker. **The OS
chooses the port** — supplying a single server on a fixed port from outside would collide as many times as there are worktrees side by side.

## Related ADRs

- [0051](../docs/adr/0051-styling-system.md) — the basis for stopping motion and capturing the initial state
- [0053](../docs/adr/0053-ui-component-interaction-seam.md) — the decision to treat a dropdown's menu as modal (the basis for the `aria-hidden-focus` declaration)
- [0054](../docs/adr/0054-ui-catalog-storybook.md) — making automated a11y checks work on stories
- [0090](../docs/adr/0090-testing-strategy.md) — per-layer responsibilities, and the treatment of `visual` as having no declaration
- [0091](../docs/adr/0091-test-verification-methods.md) — per-story comparison, and pinning the execution environment
- [0100](../docs/adr/0100-accessibility-target.md) — the conformance target (WCAG 2.x Level AA)

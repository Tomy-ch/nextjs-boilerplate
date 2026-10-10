---
test-requirement: unit
---

# baseline

Holds the store of baseline images and the operations that act on it (retake, push, approve, clean up).
**Story-level capture ([vrt](../vrt/README.md)) and screen-level capture ([e2e](../e2e/README.md)) share
one store**, so it lives here, belonging to neither.

| Where | What |
| --- | --- |
| `images/` | **Submodule.** The gitlink pointing at the baseline image store |
| [`lib/store.ts`](lib/store.ts) | The store's area layout: how the two kinds of capture divide it, whether a retake is in progress, and what is cleared before a full retake |
| [`lib/orphans.ts`](lib/orphans.ts) | Reconciling the images in the store with the images that should exist. The annotation type that carries mismatches into the report |
| [`lib/report-gap.ts`](lib/report-gap.ts) | Puts the reconciliation result into Playwright annotations |
| [`lib/targets.ts`](lib/targets.ts) | The reverse mapping from the diff pushed to the store back to the target names the review entry points take |

**Only questions to which both kinds of capture give the same answer live here.** Building the list of what
should exist differs because each counts its capture targets differently, so each side owns it
([vrt](../vrt/lib/expected-baselines.ts) / [e2e](../e2e/lib/screen-baselines.ts)). The tag attached to the
reconciliation check is owned by each side for the same reason. Conversely, deriving a target name from a
store path is decided by the area layout alone, so this directory holds the single copy.

## Why there is one store

Because the unit of approval is **one store pointer**. Splitting only the retake in two would mean retaking
under two labels what is approved under one, and the granularity of approval and capture would diverge.
Cleanup is the same: dropping the sets unreachable from live refs is an operation on one store.

The `screen/` area is screen-level; everything else is story groups. That no story group claims this
reserved area is checked on every capture, before capturing (`assertAreaUnclaimed` in
[`lib/store.ts`](lib/store.ts)). After capture, both kinds of image would be mixed in one place and could
not be separated.

## Shape of the store

```text
<area>/…/<subject>.png
```

The store's contents satisfy three conditions, and every function in `lib/` stands on them.

- **The file name is the capture target's name itself.** For both story ids and screen names, the basename
  without the extension is directly a name that can be passed to the retake scope (`VRT_ONLY` / `E2E_ONLY`)
  or to a review entry point. This is why the reverse mapping (`baselineName` / `retakenTargets`) looks only
  at the basename; if names were transformed into file names, the reverse mapping would need a copy of the
  mapping table.
- **The order of areas must match between the array capture passes to `toHaveScreenshot` and the side that
  builds the list of what should exist.** If they disagree, everything surfaces as orphans. Pass an array to
  `toHaveScreenshot` — as a single string, Playwright sanitizes `/` as part of the file name, and everything
  lands flat in one level instead of in areas.
- **The store's top level holds elements other than image areas.** The root `README.md`
  ([the store's README](../.github/settings/baseline-store/readme-template.md)) and
  `render-inputs.sha256`, the hash of the inputs that decide the pictures ([vrt](../vrt/README.md)). So
  counting filters by extension, and deleting enumerates what to keep.

## The reconciliation check runs both ways

Store consistency is checked in both directions: **orphans** (baseline images whose capture target is gone)
and **gaps** (capture targets without a baseline image). One direction is not enough — in a run that skips
comparison, Playwright does not fail "a capture target without an image", so checking only orphans lets a
missing baseline image pass green.

Mismatches found are not only failed but **put into Playwright annotations** (`baseline-orphan` /
`baseline-missing`, [`lib/report-gap.ts`](lib/report-gap.ts)). The retake can read only the report, so
without the names it cannot tell orphans from out-of-scope images, falls back to a full retake, and
re-places even images nobody reported.

| Annotation | What the retake does | Why it is recorded |
| --- | --- | --- |
| `baseline-orphan` | **Deletes it.** There is nothing to capture, so a retake does not fix it | Without naming what to delete, it falls back to a full retake |
| `baseline-missing` | **Captures it.** Added to the scope together with the reported diffs | For runs that skip comparison. In a run that compares, the capture itself fails and appears in the list |

The check runs only on full runs. A narrowed run cannot tell out-of-scope images from orphans
([vrt/README.md](../vrt/README.md)). Checking the store once is enough, so a side with several bands or
rigs picks just one to run it.

**It does not look during a retake.** Captures run in parallel, so the check would read other captures'
progress as gaps. What it protects is the committed state, not a store being written to. Whether a retake
is in progress is **stated explicitly by the side that started it, with `BASELINE_RETAKE=1`**
(`make vrt-update` / `make e2e-update`). Playwright's `updateSnapshots` is not read — its default value is
not `none`, so even runs that are not retaking would be treated as retakes, and the check would silently
disappear. Only one of these two mechanisms can carry the retake signal.

## Retakes do not delete stale files

Playwright's `--update-snapshots` only writes what it captured. Renaming or deleting a story or screen
leaves images under the old name in the store, and the reconciliation check fails them as orphans. A
retake does not fix that, so **only on a full retake is the area emptied before capture**
(`clearableStoryEntries` for stories, the whole area for screens).

- **A narrowed retake does not empty anything.** Images of targets not being captured would vanish too,
  and unreported diffs would enter the store. Deciding that no narrowing happened belongs to the caller
  (the make side), and unknown arguments fall to the not-deleting side ([vrt/README.md](../vrt/README.md)).
- **The CI retake does not empty the area; it deletes orphans by name.** Its scope is narrowed to the
  report, so it drops only the orphans in the annotations and captures only the reported targets and gaps.
- **Enumerate what to keep, not what to delete.** Story group names are determined by story titles, and
  the store side has no way to learn of additions or removals. So **when adding an element other than an
  image area to the store's top level, also update the keep list in `lib/store.ts`**. Forget it, and it
  silently disappears on every full retake. Elements starting with `.` (under git's control) are always kept.

## From diff back to target names

The "one line to view locally" that the retake comment outputs takes as its argument the **names** the
review entry points (`make vrt-review` / `make e2e-review`) accept. The rules for turning the diff pushed to
the store (`git diff --name-status`) back into names are owned by [`lib/targets.ts`](lib/targets.ts).

- **Images that disappeared are dropped.** A full retake empties the area first, so renamed or deleted
  targets appear in the diff as deletions. Names that cannot be opened are not listed in the guidance.
- **Renames count by destination.** A rename that leaves the picture unchanged is collapsed by git into a
  rename, so looking only at the deleted side drops the target altogether.
- **Entries with no identical path in the previous set (new files and rename destinations) are returned
  separately as "no previous to look up".** The side that shows before and after treats this set as having
  no before.
- **Names are collapsed; images are not.** The same target has one image per theme and per band, so only
  the first name is kept, preserving the order received. Counting images and laying them out one by one is
  the image side's job.
- **Statuses are received as is.** So that the decision of what to include lives here rather than in `git`
  flags; the caller passes the diff unprocessed.

## Operations

| What you want to do | Locally | CI |
| --- | --- | --- |
| Retake stories and push | `make vrt-retake` | `baseline-retake` label |
| Retake screens and push | `make e2e-retake` | Same as above (one label captures both) |
| Push what was captured | `make baseline-push` | Included in the retake |
| After switching branches, align the files with the pointer | A hook calls `make baseline-sync` (`post-checkout` / `post-merge`) | Fetches only the recorded commit |
| Clean up history | `make baseline-prune` | Only an issue prompting it is opened monthly. **A human always triggers the run** |

The CI retake handles stories and screens together. **Both scopes are narrowed to the comparison report for
that commit** — VRT's report for stories, E2E's for screens. It captures the targets and gaps in the report
and deletes orphans. What happens when there is no report (no diff, or no comparison) and when it becomes a
full retake are owned by [docs/design/vrt.md](../docs/design/vrt.md).

**Only `make baseline-push` pushes.** Committing directly inside the submodule chains retakes together so
that cleanup can drop none of them. Capturing without pushing leaves the parent's gitlink stale while only
the working tree is new, so local capture passes and only CI fails.

## Adding a kind of capture

To put a third kind of capture on the same store, line up the following.

1. **Reserve an area.** Put the area name in `lib/store.ts` so that `assertAreaUnclaimed` can check it for
   collisions with story groups. Add it to the keep list too — so a full story retake does not delete that
   area. The story side counts "everything except reserved areas", so add it to the exclusions of
   `listBaselines` as well.
2. **Hold the list of what should exist and the tag on your own side.** Match the order of areas with the
   array passed to `toHaveScreenshot`, and make the file name the target name itself.
3. **Call three things from the spec.** `assertAreaUnclaimed` before capture; for the reconciliation check,
   skipping via `isRetaking` and `noteBaselineGap`. The check runs only on full runs, once against the store.
4. **Have the capturing make target set `BASELINE_RETAKE=1`, and empty the area only on full runs.**
   The narrowing decision lives on the make side.
5. **Teach the reverse mapping the area.** `retakenTargets` routes stories and screens by area name, so if
   review entry points multiply, split them there too.

## Retaking is not approval

`baseline-retake` only **makes the pixels viewable**; accepting the look is expressed by
`baseline-approve`. Why approval is taken as a label, and how approval applies only to the current set, are
owned by [docs/design/vrt.md](../docs/design/vrt.md) from "A retake is not an approval." onward.

The overall mechanism is in [docs/design/vrt.md](../docs/design/vrt.md).

## Related ADRs

- [ADR 0091](../docs/adr/0091-test-verification-methods.md) — the visual regression decision: keeping the store in a separate repository, and the paths for retake and approval

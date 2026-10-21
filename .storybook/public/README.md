# Assets Served to the Catalog

The home of the static assets Storybook serves. The catalog configuration (`staticDirs` in [`../main.ts`](../main.ts))
serves them alongside the app's `public/`, and **both are visible from the catalog's root**.

## Why it is separate from the app's `public/`

**So that verification assets are not mixed into what production serves** ([0054](../../docs/adr/0054-ui-catalog-storybook.md)).
What is placed here does not enter the app build, and it is not caught up when the side that created the repository from the template discards the sample.

Conversely, **images the app outputs are not placed here**. The fallback image shown for a subject without an image
(`public/no-image.svg`) is something users actually see, so it is part of what the app serves.

## What Is Here

| File | Tracked | Purpose |
| --- | --- | --- |
| `sample-avatar.svg` | yes | A picture shown as a user's face. The subject survives being cropped to a circle |
| `sample-document.svg` | yes | A thumbnail of an attached file. Still reads as "an image file" when squeezed down to `2.5rem` |
| `sample-item-1.svg` to `-3.svg` | yes | Every place where the picture itself is not the subject. A test bed for aspect ratio, zoom and paging |
| `mockServiceWorker.js` | **no** | The service worker that intercepts fetches. The catalog configuration copies it from the dependency on every startup, so it always matches the dependency's version |

**There are three `sample-item-*` designs because some places need as many different designs as there are images.** A component that pages through images
(`ImageViewer` and the screens that carry it) can show that the position changed only through the difference in design.
With one design repeated, neither the baseline image nor the eye can tell whether paging works.

## Notes When Adding

- **Publish the spelling of an added asset in [`../lib/sample-asset.ts`](../lib/sample-asset.ts).** Stories read only
  from there, so a rename leaves one place to fix
- **Do not reuse a name from `public/`.** The two locations are served from the same root, so when names collide,
  which one is served depends on the serving order
- **Do not point a story directly at a file under `/src/...`.** The dev server serves it straight through, but it is
  not part of the `storybook build` output, so **capturing a baseline image approves the broken picture as is**
  ([0091](../../docs/adr/0091-test-verification-methods.md)). If the catalog needs a picture, place it here and
  reference it from the serving root
- **An unresolved URL fails.** That a root-absolute asset URL is missing from the serving root, and that one points
  at `/src/...`, is checked by [`scripts/catalog-assets.gate.test.ts`](../../scripts/catalog-assets.gate.test.ts).
  **A story that wants to show the 404 itself** (the look of a load failure, for example) declares it, with a reason
  and a removal condition, in [`scripts/lib/catalog-assets.ts`](../../scripts/lib/catalog-assets.ts) instead of placing a file
- **Do not place pictures that contain text.** Fonts vary by runtime environment, so the baseline image wobbles
  depending on where it is captured
- **Keep the sample's vocabulary out of both names and content.** This is the side that remains after the creating side
  discards the sample, and it is also excluded from the residual-vocabulary check (`EXCLUDED_PATH_PREFIXES` in
  `scripts/setup/remove-sample/sample-manifest.ts`). **With no machine to object, name things by role** — treat them
  not as "products" but as "a picture placed where a picture is needed", and a creating side without the sample can use
  them unchanged. For the same reason, keep the content to abstract shapes, pictograms and silhouettes

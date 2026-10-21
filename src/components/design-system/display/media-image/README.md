# MediaImage

## Purpose

Uses `next/image` and consistently applies a fixed aspect ratio, a CSS Skeleton and the preload for LCP.

## Role and Public Components

| Component / constant | Role |
| --- | --- |
| `MediaImage` | Fits `next/image` into a fixed-ratio wrapper and by default shows a CSS Skeleton underneath. |
| `MEDIA_IMAGE_ASPECT_RATIO` | The constant that selects the fixed ratio: `square`, `standard` or `wide`. |

## Use Cases

Use it for images in lists, details and descriptions. Ordinary images default to the Skeleton; only an LCP candidate sets `priority` to `preload` and omits the Skeleton. `placeholder="blur"` and `blurDataURL` are also available when specified explicitly.

Where items without an image set are listed, pass `null` as `src` and specify a substitute image in `fallbackSrc`.

## Responsibility Boundaries

It is a Server Component and owns neither building the URL from `imagePath`, the image fetch state, a fallback on load failure, nor business alt text. These are owned by the feature / model. Blur is available with a static import or when the caller passes it explicitly, but it is not part of the ordinary API contract for backend-provided images.

### Substitution when there is no image

`src` accepts `null`. If "there is no image" were expressed by a branch in the caller, whether to show the frame and what to show instead would differ from caller to caller, so the choice of path is closed inside this component.

| `src` | `fallbackSrc` | Rendering |
| --- | --- | --- |
| present | — | the `src` image |
| absent | present | the `fallbackSrc` image |
| absent | absent | renders nothing (no frame either) |

**It does not hold the substitute image's path.** Which image to use instead depends on the nature of the item, so the caller passes it. The alternative text while the substitute image is shown is carried by `fallbackAlt`, whose default is the empty string. The substitute image says nothing about the item, so `alt` is not reused as is.

This is not a substitution on load **failure**. It has no `onError` because detecting a failure requires the client runtime. Where needed, a client island on the feature side wraps it.

## Storybook and Tests

Storybook checks the Skeleton, preload and explicit blur; the tests check the ratio, omission of the Skeleton, the `next/image` props and a11y.

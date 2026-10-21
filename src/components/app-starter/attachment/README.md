# Attachment

## Purpose

Displays selected files one at a time. It puts together an icon or thumbnail showing the type, the name, a supplement such as size or progress, and actions such as cancel or resend.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AttachmentGroup` | A named `group` that lays out several attachments horizontally. What does not fit scrolls horizontally. |
| `Attachment` | The frame of one attachment. `size` / `orientation` / `state` choose its look. |
| `AttachmentMedia` | The frame that holds the icon or thumbnail showing the type. |
| `AttachmentContent` | The region that stacks the name and the supplement vertically. |
| `AttachmentTitle` | The attachment's name. Truncated at the end when it does not fit the frame. |
| `AttachmentDescription` | The supplement: size, progress, failure reason and so on. |
| `AttachmentActions` | The region that lays out actions. In `vertical` it overlaps the frame's top-right corner. |
| `AttachmentAction` | An action on one attachment. Composes `Button`. |
| `AttachmentTrigger` | A full-surface hit area that makes the whole frame pressable. |

`ATTACHMENT_SIZE` / `ATTACHMENT_ORIENTATION` / `ATTACHMENT_STATE` / `ATTACHMENT_MEDIA_VARIANT` and their corresponding types are exported from `attachment.definition.ts`. These definitions own the values that can be specified, and callers do not write strings such as `"error"` directly.

| state | Look |
| --- | --- |
| `idle` | Makes the border dashed to show the content is not settled yet. |
| `uploading` | A band flows across the whole frame to show the upload has not stalled. |
| `processing` | Likewise, a band flows across the whole frame. |
| `error` | Puts the border and the media frame in the failure color. |
| `done` | Displays as an ordinary frame. The default. |

| orientation | Look |
| --- | --- |
| `horizontal` | Lays out the icon, name and actions horizontally. The default. |
| `vertical` | Puts the thumbnail on top and the name below, and overlaps the actions at the top right. |

## Use Cases

- Listing selected files so each can be cancelled individually
- Distinguishing uploading, converting and failed visually while keeping the same frame
- Laying out attachments with image thumbnails in `vertical`
- Pressing the attachment itself to navigate to details or the original file (`AttachmentTrigger`)

## Responsibility Boundaries

In the SSR-first selection it falls under `◎`. It is a display-only Server Component that needs no hydration and has no client island. Only the parts that react to presses are built by the caller as client components.

It does not own file selection, uploading, deletion, retrying or computing progress. `state` only switches the look; the caller manages the actual progress. The name, size and progress are all received as preformatted strings. Formatting byte counts is the responsibility of the formatters in `model/`.

`state` does not reach assistive technology. Show that an upload is in progress or has failed in the `AttachmentDescription` text as well. For failures that need the user to act, do not rely on this frame alone; combine it with `Alert` or similar on the feature side.

The icon and image in `AttachmentMedia` are both decorative. The `AttachmentTitle` text conveys which file it is, so the image's `alt` can be empty.

The caller must always give `AttachmentAction` and `AttachmentTrigger` an accessible name. Both end up as only an icon or only a surface, so without a name it is unclear what the action targets. Include the attachment's name in it.

`AttachmentTrigger` overlaps the whole frame, so it suppresses its own focus indicator and `Attachment` shows a `focus-within` outline instead. `AttachmentActions` sits further on top, so each individual action can still be pressed.

`AttachmentGroup` does not own the count, order or limit.

The vendors are Radix's `Slot` (composition via `asChild`) and `class-variance-authority`, but the public API includes no vendor names.

## Storybook and Tests

Storybook checks the default attachment, the 5 stages, how it looks until it is dismissed automatically, the 3 sizes, the `vertical` layout, using an image as a thumbnail, making the whole frame pressable, truncating the name and supplement, and laying several out horizontally. Borders, overlap, truncation and horizontal scrolling can all be judged only by actual rendering, so they are within Storybook's scope. `Dismissing` lets you check the remaining-time display and how it disappears without choosing a file, and can be replayed any number of times with `並べ直す`.

In addition, there are two wiring examples connected to `FileUpload`. `UploadFlow` walks through selection, acceptance, rejection and cancellation with real interaction, and **what you choose does not disappear**. `UploadFlowAutoDismiss` is the case where attachments that finished uploading disappear automatically; it shows the time remaining until they disappear with `ProgressClient`, and stops the timer while hovered / focused and while the page is not visible (WCAG 2.2.1). Both stories fix their behavior and have no in-story control to switch it.

Automatic removal is a setting of whoever owns the list, not a feature of this component. An `error` that needs handling is not subject to it.

Tests check that the defaults are `done` / `default` / `horizontal`, that the three values are exposed as data attributes, that `state` conveys nothing to assistive technology, that the media type is exposed, that actions can be given an accessible name and pass presses to the caller, that the trigger defaults to `type="button"` and can be composed into a link with `asChild`, that the trigger and individual actions can be placed together, that `AttachmentGroup` contains several and becomes a named `group`, and automated a11y checks.

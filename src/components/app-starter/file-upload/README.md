# FileUpload

## Purpose

Lets the user choose files to send, and tells them before sending whether the format and size meet the requirements.

## Role and Public Components

| Component | Role |
| --- | --- |
| `FileUpload` | The region for choosing files. Drop them by dragging, or press it and choose from the selection dialog. It passes only what it accepted to `onSelect` and what it rejected, with reasons, to `onReject`, and while sending it stops interaction and shows progress. A client island. |

`FILE_UPLOAD_REJECTION_REASON` is the value set of rejection reasons, with `type` (does not match `accept`) and `size` (exceeds `maxSize`).

## Use Cases

- When there are conditions on format or size and you want to avoid rejection only after sending
- When sending takes time and you want to show that it is in progress and prevent double submission
- When you want to show which files were chosen in your own style, without relying on the browser's default display

Not used when the conditions are loose and returning the Server Action's validation result is enough. The combination of `Field` and `Input type="file"` covers that.

## Responsibility Boundaries

In the SSR-first selection, the native base is `Field` + `Input type="file"` + Server Action. This component is a client island that takes on only what that base cannot express: **validation before sending, displaying the selection, and suppression and progress while sending**. Hydration is needed to hold the selection, so it cannot be rendered directly from a Server Component.

**It owns no submission path.** This component does not know where or how what was chosen is sent. Whether it is sending (`pending`), progress (`progress`), and handling identifiers after completion are all passed in and out by the caller through props and callbacks. It can be used without waiting for the path to be decided.

**It owns no error copy.** `onReject` passes only pairs of the rejected file and the reason. The caller builds the copy shown to the user and displays it as a `FieldError`. `aria-invalid` is also decided by the caller. This is so that server-side and client-side validation results are handled in one place.

**It owns no size formatting.** It displays only the names of accepted files. Copy such as "up to 2 MB" is built by the caller.

**Drop is an accelerator, not the only path.** Dragging is available only in environments with a pointer, and works with neither touch nor keyboard. The whole region is the `label` of the `input`, so pressing anywhere opens the selection dialog, and the `input` itself can be reached with Tab and opened with Enter. This meets the alternative to dragging movements that WCAG 2.5.7 (Dragging Movements) requires.

Dropped files are written back into the `input`'s `files`, so they are included in a native form submission as is. Without `multiple`, only the first of several dropped files is accepted.

The region's copy is also added to the `input`'s accessible name. Combined with `Field`'s `FieldLabel`, the names chain together, so keep `prompt` and `triggerLabel` short.

**The owner of the finished selection can be chosen.** By default it lists the names of accepted files itself, but with `resetOnSelect` it returns to empty once it has handed them over and holds neither a display nor a record. Use this in assemblies where [`UploadPreview`](../upload-preview/README.md) holds the list of what was chosen. If both hold a record, removing one item in the caller does not change the upload area's display, and the same file is listed in two places that disagree. Returning to empty also makes it possible to choose the same file again (because an `input` does not report a change unless its value changes).

**It does not own preview or removal of selected items.** The per-file row UI and the assembly including preview and replace are each handled by separate components.

`accept` and `multiple` work as native attributes as they are, and the same values are also used for validation before sending. `accept` matches by an extension such as `.png`, a wildcard such as `image/*`, or an exact match such as `image/png`. When `accept` is omitted, nothing is rejected for format.

## Storybook and Tests

Storybook checks the default form, multiple selection, validation before sending and the error display, sending (with / without progress), the non-operable state, and replaced copy.

Tests check that it is exposed as a `type="file"` control, that the whole region is the `label` of the `input`, that it generates its own `id` when none is passed, that dropped files go through the same validation and are written back into the `input`'s `files`, that only the first one is accepted without `multiple`, the highlight while dragging and that moving within the region does not clear it, that drops are not accepted while sending, that the names of accepted files are listed and passed to `onSelect`, that formats not matching `accept` and sizes exceeding `maxSize` are passed to `onReject` with reasons, that `accept` matches by extension, wildcard and exact match, the handling of empty separators and whitespace-only values in `accept`, that `onReject` is not called when nothing is rejected, cancelling the selection, that the caller's `onChange` is called too, that it cannot be operated with `pending` and `disabled`, that named progress is displayed only when `progress` is passed, and automated a11y checks.

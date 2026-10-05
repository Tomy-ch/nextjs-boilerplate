# UploadPreview

## Purpose

Reviews the selected files in a list and replaces, cancels or retries them.

## Role and Public Components

| Component | Role |
| --- | --- |
| `UploadPreview` | A client island that lays out the selected files and places per-item actions. |
| `UploadPreviewItem` | The type representing one item in the list (identifier, name, description, state, preview source). |

## Use Cases

Used to have the user review files chosen with `FileUpload` before sending. Choosing is handled by [`FileUpload`](../file-upload/README.md) and the look of one item by [`Attachment`](../attachment/README.md); this component owns only **how they are grouped and the per-item actions**.

```tsx
<FileUpload accept="image/*" multiple onSelect={add} />
<UploadPreview items={items} onRemove={remove} />
```

`orientation` chooses how they are laid out. The default `list` is a vertical list, used when you want per-item supplements to be read too. `row` is a horizontal group, used when you do not want it to take vertical space as the count grows. Even in `row` the composition of one item does not change; it just wraps. It does not switch to vertical tiles because those are fixed at a small width and overflow the frame when per-item actions are stacked on them.

**When you only need a horizontally scrolling group with no actions, use `AttachmentGroup`.** What this component owns is the per-item actions, and the layout is the container for them.

## Responsibility Boundaries

**It does not hold the list itself.** `items` is the caller's state, and reflecting the results of cancelling or retrying is also the caller's. It does not own the submission path, storage, or business meaning (this is why it can be used without waiting for ADR 0075's path decision).

When a `File` is passed as `preview`, **this component takes on creating and revoking the display URL**. Without revocation, unreleased references pile up every time the selection is redone, so the owner is fixed in one place. This is also why it is a client island. When the file has already been sent and its URL is known, pass a string; it then neither creates nor revokes anything.

Only rows given a `preview` have a thumbnail. **It does not decide an icon from the file type.** The mapping between type and icon varies by use, so if needed the caller passes an image as `preview`, or drops down to `Attachment` and chooses `AttachmentMedia`'s `variant`.

Images are rendered with a plain `img`, not `next/image`. For an object URL neither the dimensions nor the origin are known in advance, so `next/image` optimization cannot work.

**The order belongs to the caller.** When a reorder action is passed, it returns the target id. The caller that owns `items` does the actual swapping; this component goes only as far as making the button that moves an end item further unpressable. Where the order itself has no meaning, do not pass it, and no button appears.

Buttons for actions not passed are not rendered. While `pending`, every action is stopped, but **the list display remains**, because otherwise it becomes unclear what is being sent while sending.

The accessible name of each action includes the target file name. Buttons of the same shape are repeated for every item, so the name alone must tell which item the action is for.

While `state` is `uploading` / `processing`, **the retry button is replaced with a spinner**. Progress is visible where the user pressed, and the same action cannot be pressed twice.

**The spinner appears because of `state`, not because the button was pressed.** Only the caller knows when the resend finishes, and if it started from the press this component could never finish. On receiving a retry, the caller sets `state` to `uploading`, and when the result is in, moves it to `done` or `error`.

`state` only changes the look and does not reach assistive technology. Show in progress and failure in the `description` copy as well. The spinner is also placed as decoration, so screen reader output is carried by `description`.

When nothing is selected, it renders nothing. Whether to show an empty list or copy prompting a selection is the screen's decision.

## Storybook and Tests

Storybook checks the default cancel-only form, passing all actions, a review-only list with no actions passed, the five `state`s, a mix of image and non-image files, names and descriptions that do not fit the frame, sending, real interaction wired to `FileUpload`, and the transition from retry to completion. Tests check that items are listed as a named list, that nothing is rendered when empty, that buttons for actions not passed are not shown, that action names include the target file name and return the id, that actions stop while sending and the list remains, that retry changes to a spinner on `uploading` and returns once finished, that the spinner is decorative, that a display URL is created from a `File` and revoked when it is removed, that nothing is created or revoked when a URL is passed, that no image is shown when `preview` is omitted, and automated a11y checks.

jsdom does not implement object URLs, so `URL.createObjectURL` / `revokeObjectURL` are replaced on the test side, and only the lifetime calls are observed.

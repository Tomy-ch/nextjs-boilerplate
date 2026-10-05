# AlertDialog

## Purpose

Confirms an irreversible operation, such as deletion, before it runs.

## Role and Public Components

| Component | Role |
| --- | --- |
| `AlertDialog` | The client-side root that provides the open state of the confirmation dialog. |
| `AlertDialogTrigger` | The trigger that wraps the action opening the dialog. When using `Button`, compose it with `asChild`. |
| `AlertDialogContent` | Renders the dialog body together with the Portal and overlay. |
| `AlertDialogOverlay` | Covers what is behind the dialog. `AlertDialogContent` uses it internally. |
| `AlertDialogPortal` | The Portal it renders into. `AlertDialogContent` uses it internally. |
| `AlertDialogHeader` | The area that groups the title and description. |
| `AlertDialogTitle` | The title that becomes the dialog's accessible name. |
| `AlertDialogDescription` | The body text explaining the effect of the operation and what to do next. |
| `AlertDialogFooter` | The action area that lays out cancel and action. |
| `AlertDialogAction` | Completes the confirmed operation and closes the dialog. Composes `Button` and accepts `variant` / `size`. |
| `AlertDialogCancel` | Cancels the operation and closes the dialog. By default it composes an `outline` `Button`. |

## Use Cases

Use it right before an operation that cannot be undone, to make the user read what will happen before running it. Deletion, account cancellation and unpublishing are examples.

Do not use it for auxiliary detail views or ordinary editing. Those belong to [`Dialog`](../dialog/README.md). `AlertDialog` is a dedicated form for confirmation, and using it for content that needs no confirmation gets in the way of the operation.

Indicate that an operation is destructive not only through color but through text. The default of `AlertDialogAction` is an ordinary `Button`, so to make it look destructive the caller specifies the `destructive` variant of [`Button`](../../action/button/README.md).

## Responsibility Boundaries

While open it holds one history entry, and **the back action closes only itself** ([0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)).

As a client island it handles opening / closing, the focus trap and Escape; the feature passes the confirmation content, the Server Action and the result as children.

It does not own what is deleted, where to navigate after running, or what to show on failure. `AlertDialogAction` goes only as far as closing the dialog; running the operation itself is done by the caller's handler or a `form` submission.

**Place failure text inside `AlertDialogContent`.** While it is open, the outside is covered by the overlay, and Radix also sets `aria-hidden` on everything behind, so it does not reach assistive technology even with `role="alert"`. **The caller decides what to show, but where to show it is decided by how this component is built.**

**Hold the submission state inside as well.** On close, Radix removes the content along with its tree, so if the state is outside, only the dialog is recreated, and **a dialog that has sent nothing shows the previous failure**. Call `useActionState` in a child of `AlertDialogContent` so that it starts from the initial state every time it opens.

Radix associates `AlertDialogTitle` and `AlertDialogDescription` as the dialog's accessible name and description. Omitting the title leaves the dialog without a name, so always include it.

The vendor is currently Radix, but the public API contains no vendor name.

## Storybook and Tests

Storybook checks the basic composition of confirming a destructive operation (`Default`). The tests check opening / closing from the trigger, the `alertdialog` role and the accessible name from the title, closing with `AlertDialogCancel`, and the automated a11y check.

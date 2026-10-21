# Button

## Purpose

Starts a user action.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Button` | A button that starts an action. It provides `variant`, `size`, `disabled` and `pending`, and with `asChild` it can apply the same look to other interactive elements such as links. |

## Use Cases

Used for submitting forms, on-screen actions, and retrying. For navigation, combine `asChild` with a single link element: `next/link`'s `Link` for in-app navigation, and a native `a` for external URLs.

Use `destructive` for actions that cannot be undone. Color alone cannot convey what will happen, so show it in the copy too ([`AlertDialog`](../../overlay/alert-dialog/README.md)).

## How Pending Is Shown

When `pending` is passed, it overlays a spinning marker **while leaving the copy in place**, and makes the button unpressable.

Replacing the copy with something like 「送信しています…」 ("sending…") or adding the marker next to the copy changes the container's width. On a summary pinned beside the content or a band fixed to the bottom edge, the surrounding positions move too. Overlaying avoids that jitter.

Copy that is no longer visible also drops out of assistive technology, so `pendingLabel` conveys that the user is waiting. If omitted, it is conveyed only visually.

It cannot be combined with `asChild`, because this component cannot rearrange the content of the element it composes into.

## Responsibility Boundaries

Business permissibility, the in-progress state and result notifications are managed by the feature. The native `type` for form submission is also stated explicitly by the caller.

## Storybook and Tests

Storybook checks variants (including `destructive`), sizes, disabled, pending and links; tests check the basic display and `asChild`.

# NotificationCenter

## Purpose

The surface for checking persistent notifications. It handles the unread count, the list of notifications, the action to mark as read, and the state with no notifications.

Notifications of temporary action results are handled by [`toaster`](../../shell/toaster/README.md). Something that disappears in a few seconds and something you check later are different things.

## Role and Public Components

| Component | Role |
| --- | --- |
| `NotificationTrigger` | The action that opens the list. Includes the unread count in its name. |
| `NotificationPanel` | Gathers the unread count and the action to mark all as read. |
| `NotificationList` | The list of notifications. Only its inside scrolls. |
| `NotificationItem` | One notification. Shows unread with a marker and a word. |
| `NotificationEmpty` | The state with no notifications at all. |

It does not own the container that opens (`Popover` / `Sheet`). The caller assembles it and passes `NotificationTrigger` as its trigger.

## How Unread Is Conveyed

**Include the count in the trigger's name.** With only an icon and a number, assistive technology cannot tell "a count of what".

**The trigger's count is not a live region.** Announcing every increase in the background interrupts other actions in progress. The change in count needs conveying only while the list is open, and that is handled by `NotificationPanel`'s count display (`aria-live="polite"`).

**Unread is shown not only with a dot but also with a word for screen readers only.** With color and a marker alone, the distinction does not reach assistive technology.

## Focus After Marking All as Read

When everything is marked as read, that action itself becomes unpressable. If the focus from the press stayed there it would have nowhere to go, so **focus is moved to the list just before running it**.

It is received in the capture phase (`onClickCapture`) so that focus moves before the caller's processing makes this action unpressable.

## The State with No Notifications

It shows that there are none instead of removing the whole list. Left blank, it cannot be told whether loading failed or there really are none. The display composes `FeedbackState`'s `empty`.

## List Height

The count grows, so the height is capped and only the inside scrolls. If the opened surface stretched along with the page, the whole screen would move to read notifications.

## Responsibility Boundaries

It does not own delivery, recording read state, the meaning of notification types, or navigating to details. The caller passes the count and the notifications' content, and read actions are returned through callbacks.

To navigate to details, pass `ListItemLink` as the content, or put a link inside the content. The caller decides the destination.

When additional loading is needed, compose [`cursor-pagination`](../cursor-pagination/README.md) below the list.

## Storybook and Tests

Storybook checks the state with unread items, the state with no notifications, the case with many items, and the actual form composed with `Popover`. Tests check the trigger's name and count, the count's live region, the mark-all-as-read notification and focus movement, that it cannot be pressed when there are no unread items, the list's name, the unread word, the copy for the no-notifications state, and automated a11y checks.

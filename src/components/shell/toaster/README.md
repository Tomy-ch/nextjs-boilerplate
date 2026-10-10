# Toaster

## Purpose

Shows the success or failure of a mutation that does not redirect as a temporary notification.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ToastProvider` | Client Provider that holds the notification queue and the limit on simultaneously visible notifications, so notifications can be raised from anywhere beneath it. It renders `Toaster` itself. |
| `useToast` | Retrieves `toast()` / `update()` / `dismiss()` and the visible-limit `visibleToasts` / `setVisibleToasts` from beneath the Provider. Throws when called outside the Provider. |
| `Toaster` | Stacks the notifications it is given in a corner of the screen. It holds no queue. |
| `Toast` | Type representing a notification's id, text, variant, optional auto-close `duration`, and optional `action`. |
| `ToastAction` | Type representing an action (text and handler) that can be run directly from a notification. |
| `ToastPatch` | Type of the patch passed to `update()`. The `id` cannot be changed. |
| `ToastControls` | Type of the set of operations `useToast()` returns. |

`toaster.definition.ts` owns static definitions such as `TOAST_VARIANT`, `TOAST_POSITION`, `DEFAULT_VISIBLE_TOASTS`, `DEFAULT_TOAST_POSITION` and `DEFAULT_TOAST_HOTKEY`.

Internally it is split into three files by responsibility: `toaster.tsx` holds the queue and the public surface, `toast-region.tsx` the stacking position, the collapsing and the way to reach the region, and `toast-item.tsx` the rendering, timing and swipe-to-dismiss of one notification. `ToastRegion` and `ToastItem` are not public API.

## Use Cases

Use it for save completion of local actions, non-destructive failures, and completion notices of background processing.

Normally `ToastProvider` is placed once in the root layout, and the side raising a notification only calls `toast()` from `useToast()`. This way callers hold neither queue state nor dismiss wiring.

```tsx
const { toast } = useToast();
toast({ title: "保存しました", duration: 5000 });
```

To turn an in-progress display into a result, pass the `id` returned by `toast()` to `update()`. It is replaced in the same place, so the notification is not stacked twice.

```tsx
const id = toast({ title: "処理中です" });
// 完了後
update(id, { title: "完了しました", duration: 5000 });
```

Only when the caller wants to hold the queue itself, use `Toaster` directly and pass `toasts` and `onDismiss`.

## Responsibility Boundaries

The feature owns classifying Server Action results. `Toaster` holds no queue, and even with `ToastProvider` it holds only the notifications being shown; it does no persistence, resending or read tracking. For failure displays needed in context and confirmations of irreversible actions, use `FormFeedback` / `AlertDialog`.

A closed notification is also suppressed on the `Toaster` side until the caller removes it from the queue, so it disappears without waiting for the caller's update. This suppression **is lifted when that `id` disappears from `toasts`**. Otherwise, for a caller that takes the `id` per target (the same `id` when the same target fails again), the second notification could never be shown again.

The number shown at once is capped by `visibleToasts` (default 3). Without a cap, consecutive failures would cover the corner of the screen and block the working surface. Those beyond the cap stay in the queue and appear when a visible notification closes. Passing 0 or less shows nothing.

With `ToastProvider`, `defaultVisibleToasts` sets the initial cap, which can afterwards be changed at runtime with `setVisibleToasts` from `useToast()`. Use it when a particular screen alone wants a wider cap, such as a screen showing the results of a batch operation together. **Restoring a temporarily widened cap on leaving is the caller's responsibility**; otherwise every screen from then on keeps that cap.

```tsx
const { setVisibleToasts } = useToast();

useEffect(() => {
  setVisibleToasts(6);
  return () => setVisibleToasts(DEFAULT_VISIBLE_TOASTS);
}, [setVisibleToasts]);
```

`position` decides the corner to stack in. Changing it per screen would leave the source of notifications unsettled, so decide on one for the app. The swipe-to-dismiss direction is derived from this position, and only directions toward the outside of the screen are accepted. When stacked at the top or bottom center, they cannot be swiped sideways.

When there are several notifications, by default they are stacked and collapsed, and expand only on hover or when focus enters the region. To always lay them out, specify `expand`.

Notifications overlap arbitrary page content, so the surface is opaque. `Alert`'s `warning` / `destructive` are 10% colors meant for use in context, and as they are, the content below would show through. `Toaster` lays a `bg-background` base and layers that color on top. `Alert` itself looks correct in context, so it is not changed.

Only notifications whose `variant` is `destructive` interrupt the screen reader as `role="alert"`; the others wait their turn as `role="status"` without disturbing what is being read. If even success reports interrupted, assistive-technology users would have what they are reading cut off every time.

The notification region is a named landmark, and focus can be moved to it with `hotkey` (default `Alt` + `T`). Notifications disappear within seconds, so for users without a pointer this is the means to reach them. `hotkey.code` refers to a physical key, so the key in the same position works even when the keyboard layout changes. **This hotkey only moves focus to the notification region; it is not an app-wide shortcut mechanism.** A mechanism assigning keys to arbitrary actions is decided separately.

Use `action` only for actions meaningful only right after reading the notification, such as "元に戻す" (Undo) or "再試行" (Retry). Notifications disappear within seconds, so do not put an action here whose only means of reach is this. Selecting it runs the handler and closes the notification.

The `duration` progress is not ordinary processing progress but the time remaining until the notification closes. The display starts full and shrinks over time, decreasing from right to left. Do not use it to represent progress whose value increases. Rendering is delegated to `ProgressClient`; this side holds only measuring the remaining time and passing `value` / `max`. To match the 100ms update interval, the progress portion's transition is specified as linear through `indicatorClassName`.

The auto-close timer does not advance **while hovered, while focus is inside the region, while the notification is being grabbed, or while the tab is in the background**. Hover and focus signal an intent to read, and disappearing in the middle of that would betray the interaction. While the tab is in the background nobody is looking, and on returning the notification would be gone, leaving no way to learn the result.

When always expanded with `expand`, the timer is not stopped, because being expanded and being read are different things.

## Storybook and Tests

Storybook covers the three variants, auto-close, with `action`, the collapsed state and `expand`, different `position`s, the `visibleToasts` cap, raising notifications imperatively from `ToastProvider`, raising and lowering the cap at runtime, and replacing a visible notification. The tests cover display and dismiss, that a notification removed from the queue can be shown again with the same `id`, that only `destructive` becomes `role="alert"`, fitting into a named landmark, moving focus with the hotkey and the case where the modifier keys do not match, collapsing and expanding on hover / focus, the swipe-to-dismiss direction depending on `position` (not closing on the reverse direction, the center, or a non-primary button), the cap and moving up those beyond it, passing 0 or less as the cap, running `action` and the automatic dismiss, the remaining time decreasing and auto-close, `duration` of 0 or less, that the timer stops while hovered / focused / grabbed / with the tab in the background and resumes on leaving, adding, removing, capping and replacing through the Provider, the exception when `useToast` is called outside the Provider, and the automated a11y check.

Swipe-to-dismiss is verified in jsdom by dispatching pointer events directly. Real inertia and animation are not reproduced, so the feel is checked in Storybook.

# NavigationGuard

## Purpose

Confirms before navigating when the user tries to move within the app with unsaved changes.

## Role and Public Components

| Component | Role |
| --- | --- |
| `NavigationGuard` | A client island that intercepts link clicks beneath it and confirms with an `AlertDialog`. |

## Use Cases

Wrap a screen that contains a form being edited, and set `when` to `true` while there are unsaved changes. `children` is the range being watched, so pass the region that contains the links you want confirmed.

**Wrapping does not change the layout.** An element is needed to catch clicks, but that box does not take part in layout (`display: contents`). If a wrapper placed only for watching moved the look, the screen would shift every time the wrapped range was widened.

## Paths That Can Be Blocked

| Path | Blocked |
| --- | --- |
| In-app navigation through links beneath it | ✅ |
| Reload / closing the tab / navigating to an external site | ❌ Handled by [`UnloadGuard`](../unload-guard/README.md) |
| The browser's back / forward | ❌ **Cannot be blocked by either** |

Back / forward cannot be blocked because the App Router has no API to stop a client-side navigation, and `popstate` fires only after the navigation has happened. Blocking it would require pushing the history back, which overrides the user's action, so it is not adopted.

On screens that block both, use it together with `UnloadGuard`. Their responsibilities differ, so they are not combined into one component.

## Links Not Covered

The following do not stop navigation. In each case, either "the intent to leave this screen is explicit" or "no navigation happens".

- Links to another origin, links with `target`, links with `download`
- The same URL as the current location
- Clicks with a modifier key, middle clicks (an action to open in another tab; this screen is not left)
- Clicks already `preventDefault`-ed further out

## Responsibility Boundaries

It does not own deciding whether there are unsaved changes, saving, or deciding the destination. The caller passes `when` and the links. The confirmation copy can be replaced, but it has copy that makes sense by default.

The click's path is traced from `composedPath()`. It is received in the capture phase (`onClickCapture`), so it decides before the link's own `onClick`.

When the confirmation is closed, focus returns to the link that was pressed. This lets someone operating with the keyboard alone continue from the same position after staying.

## Storybook and Tests

Storybook checks pressing a link with unsaved changes, replacing the copy, the list of links not covered, and using it together with `UnloadGuard`. Tests check that it stops navigation and confirms, that on continue it hands the navigation to the router, that staying does not navigate, that it does not intercept when `when` is false, the links and clicks not covered (download / target / external / modifier key / middle click / current location / already stopped further out / non-link), and replacing the copy.

`useRouter` is replaced in tests. The navigation itself is the responsibility of Next.js, so this component checks only up to "which href it passed".

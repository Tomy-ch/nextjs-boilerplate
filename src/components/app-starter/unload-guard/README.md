# UnloadGuard

## Purpose

Shows the browser's standard confirmation when the user tries to leave the page with unsaved changes.

## Role and Public Components

| Component | Role |
| --- | --- |
| `UnloadGuard` | A client island that registers `beforeunload`. It renders nothing. |

## Use Cases

Place it on a screen with a form being edited, and set `when` to `true` while there are unsaved changes.

## Paths That Can Be Blocked

| Path | Blocked |
| --- | --- |
| Reload | ✅ |
| Closing the tab / window | ✅ |
| Navigating to an external site | ✅ |
| In-app `Link` navigation | ❌ Handled by [`NavigationGuard`](../navigation-guard/README.md) |
| The browser's back / forward | ❌ Cannot be blocked by either |

The App Router has no API to stop a client-side navigation, so `beforeunload` does not fire for navigation through `Link`. Back / forward are history operations and are outside the scope of `beforeunload`.

## Responsibility Boundaries

It does not own deciding whether there are unsaved changes, saving, or the form's values. The caller passes `when`.

The confirmation's copy and look are owned by the browser and cannot be changed. By specification the `beforeunload` message is ignored, so this component does not accept copy. Conveying "what will be lost" is the screen's role; show near the form that there are unsaved changes.

## Storybook and Tests

Storybook checks an editing form that registers the confirmation once it has unsaved changes, and the state where `when` is false. Tests check that it renders nothing, that the leave confirmation switches with the truth of `when`, and that the confirmation is released when `when` changes to false and on unmount.

For `beforeunload` the browser shows the confirmation dialog, so seeing the behavior in Storybook requires reloading or closing the tab. Tests dispatch `beforeunload` and judge whether it is registered by `defaultPrevented`.

# PullToRefresh

## Purpose

Refetches the current route by pulling down from the top edge of the screen. It works only in environments with touch.

## Role and Public Components

| Component | Role |
| --- | --- |
| `PullToRefresh` | Accepts the pull-down and calls `router.refresh()` once it passes the trigger threshold. It also renders the indicator. |

`pull-to-refresh.definition.ts` owns `PULL_STATE`, `TRIGGER_DISTANCE`, `RESISTANCE`, `MAX_DISTANCE` and `APPEAR_DISTANCE`. `use-pull-gesture.ts` observes the pull-down, but it is not public API.

## Use Cases

Place it once in the layout shell. `AppShell` mounts it internally, so callers normally do not need to think about it.

It does not know what is refetched. `router.refresh()` only has the server re-render the current route, so it means the same thing wherever it is placed. Each screen owns what its own refetch covers.

## Design

- **The browser's default pull-to-refresh is stopped only while this component is present.** Writing `overscroll-behavior` in static CSS would remove the default even on pages without this component, leaving a state where pulling does nothing
- **`router.refresh()` is not a browser reload.** Client state is kept, so open inputs and temporary selections are not lost
- **Deciding progress is delegated to `useTransition`.** `router.refresh()` does not report completion, so collapsing it on a self-chosen timer would drift from the actual fetch
- **It cannot be pulled while a modal is open.** The check looks at both of the two ways a modal declares itself — the surface setting `aria-modal`, and the background being closed off with `aria-hidden` / `inert`. Both are ARIA vocabulary, not markers of a specific overlay library. Either one alone does not work. Radix, used by the bundled overlays, adopts only the latter and does not emit `aria-modal`. Whether the background is closed off is checked starting from `main`. Tracing up from the touched element would mistake an `aria-hidden` on a decorative icon for a modal
- **In environments without touch it renders nothing.** Showing only the indicator where there is no means to pull would not lead to any action. The server makes the same decision, so the layout does not shift before and after hydration

## Cautions

**On screens with a list that loads more as you read, refetching may not change the display.** In an implementation that keeps accumulated results in client state, the state is not replaced even if the first page the server returns changes. The side that should reflect the refetch needs to build a key from the fetch result and discard the accumulation.

**How `overscroll-behavior` works on iOS varies by device.** Verification on real devices is required.

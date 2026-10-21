# MessageScroller

## Purpose

Handles the scroll position of a list that keeps being appended to. While at the end it follows new items; when the user moves up it stops following, keeps the past readable, and shows an action to return to the end.

## Role and Public Components

| Component | Role |
| --- | --- |
| `MessageScroller` | The root that holds the state. `autoFollow` decides whether to follow, and `scrollEdgeThreshold` the range treated as the end. |
| `MessageScrollerViewport` | The frame that actually scrolls. Exposed as a `region` and reachable by keyboard. |
| `MessageScrollerContent` | The region that stacks the list's content vertically. As a `log`, it announces only what was added. |
| `MessageScrollerButton` | The action that returns to the end. Not rendered while at the end. |

`MessageScroller` exposes whether it is at the end in `data-at-end`.

## Use Cases

- Displaying a conversation that keeps being appended to, without stealing the position when new items arrive mid-read
- Showing a "back to latest" path (「最新へ戻る」) only while rereading the past
- When following is not needed and it is enough to make the end the initial position (`autoFollow={false}`)

When only local scrolling is needed and following is not, use `ScrollArea`, which has no client runtime. It does not own the display of a single item, so compose `Message` or `Bubble` as children.

## Responsibility Boundaries

A client island. It uses browser APIs to observe the scroll position and detect changes in element dimensions, so hydration is needed and it cannot be rendered directly from a Server Component. In the SSR-first selection, following itself only works on the client, so no native counterpart implementation is provided.

It does not own the list's content, fetching, order, or a limit on the count. It does not detect new items either; it only watches for changes in the content's dimensions.

It has no height of its own, so give `max-h-*` or `h-*` through `className`. Without one, the content just grows and does not scroll.

The only condition for stopping following is "the user moved up". Content growing and moving away from the end looks the same, but making that the condition would stop following on every new item.

The caller must always give `MessageScrollerViewport` an accessible name. Without a name it does not become a landmark, and when focused you cannot tell what region you entered.

`MessageScrollerButton` is not rendered while at the end. If only the focus remained while it was invisible, keyboard users would reach an action whose destination is unclear.

The `log` of `MessageScrollerContent` announces only additions. Rewriting or removing existing items is not announced, so do not use it for replacing content.

The registry's `message-scroller` assumes `@shadcn/react`, so it is not copied in; these 4 are implemented here. It does not have upstream's per-item visibility detection, scroll anchoring, position preservation when prepending, or rendering control for virtualization.

It has no vendor dependency. Icons come from `components`' [`icon.ts`](../../../icon.ts), and the action uses `Button`.

## Storybook and Tests

Storybook checks that the end is shown on initial display, following while at the end, that moving up releases following and makes the action appear, turning `autoFollow` off, content that fits in the frame and cannot scroll, and giving the action copy. Following and position preservation cannot be judged without actually moving things, so a button that adds a message is included.

Tests check the `region` and `log` semantics, that the end is shown on initial display, that the action is not shown while at the end, that moving up makes the action appear, that the action returns to the end, that it follows content growth while at the end, that it keeps the position after following is released, that downward movement that does not reach the end does not restore following, that returning to the end yourself restores following, turning `autoFollow` off, a composition without a viewport, passing `ref`, the notice when used outside `MessageScroller`, and automated a11y checks. jsdom has no layout, so the scroll amount and `ResizeObserver` are substituted on the test side.

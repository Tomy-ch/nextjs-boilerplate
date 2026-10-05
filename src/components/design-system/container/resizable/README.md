# Resizable

## Purpose

Lets the user grab and move the boundary between adjacent display regions to decide how much of each to see.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ResizablePanelGroup` | The set of panes that share the allocation. It decides the orientation and overall size. |
| `ResizablePanel` | One pane. `defaultSize` / `minSize` / `maxSize` decide its size range, and `collapsible` lets it be collapsed. |
| `ResizableHandle` | The boundary between adjacent panes. Exposed as a `separator` and movable by dragging or with the arrow keys. |

## Use Cases

- When the proportion someone wants to see varies by person and situation, such as wanting to stretch an image inside a dialog
- When placing a list and details side by side and leaving it to the user which one gets more space

## Responsibility Boundaries

**It is not a component for everyday use.** The allocation of display regions is properly decided by design. Letting the user decide is limited to cases where how much of each they want to see varies by person and situation. The cases in view are limited ones, such as stretching an image inside a dialog. If you only want to place a list and details side by side, first consider whether a fixed-width layout or a screen transition is enough.

**Not used when resizing a single element is enough.** That works with CSS `resize` and `overflow` alone, needing neither client runtime nor an external package. This component is needed when **several panes share a total**.

In the SSR-first selection it falls under `○`. It is a client island that needs hydration to hold the allocation and operate the boundary, and it cannot be rendered directly from a Server Component. Pane content can be passed as `children` while remaining Server Components.

**It does not save the allocation.** When a return visit needs to restore the previous allocation, the caller saves the value received through `onLayoutChange` and passes it as `defaultLayout`. Choosing where to save is not this component's responsibility.

**It does not own scrolling of its content.** Content that does not fit has the overflow clipped. For content that must be scrolled through, put a [`ScrollArea`](../scroll-area/README.md) inside the pane. The pane itself is not made to scroll because there is no way to give it keyboard focus, which would create a region that cannot be scrolled.

Give `ResizablePanelGroup` a height through `className`. Without one it stays at the content's height, leaving no room to move the boundary.

Give `ResizableHandle` an `aria-label` stating what it separates. When omitted it becomes 「表示領域の区切り」 ("display region divider"), so always give one when there are several boundaries. If the same name repeats, you cannot tell which one you are operating. `role` and `tabIndex` are decided by the vendor and cannot be passed.

Specifying `withHandle` places a grip indicator in the center. The boundary is only 1px, and without the indicator it is not noticeable that it can be moved. The indicator itself is decorative; the whole boundary receives the interaction.

The boundary is implemented with `react-resizable-panels`.

## Storybook and Tests

Storybook checks the default horizontal layout, a vertical stack, the case without the indicator, a collapsible pane, three or more panes, and a boundary that cannot be moved.

Tests check that the set of panes and their content are laid out, that the boundary is exposed as a `separator` and reachable by keyboard, the default name when the name is omitted, that `orientation` decides the boundary's direction, that the indicator is placed only with `withHandle` and is not announced, how `disabled` is represented, that the size can be given through `className`, and automated a11y checks.

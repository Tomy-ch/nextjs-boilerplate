# Carousel

## Purpose

When there are several items of the same kind, lets the user browse them one or a few at a time, in sequence, within limited width.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Carousel` | The outer frame that tells assistive technology this is a set browsed in sequence. Always give it a name. |
| `CarouselContent` | The region that lays out slides and handles horizontal scrolling and snapping to the start of a slide. Reachable by keyboard. |
| `CarouselItem` | The content of one slide. It states by name where it sits in the whole, and `flex-basis` decides the advance width. |
| `CarouselPrevious` | The action that advances to the previous slide, overlapping the slide's left edge. It points to the one before, as seen from the slide it is placed on. A client island. |
| `CarouselNext` | The action that advances to the next slide, overlapping the slide's right edge. It points to the one after, as seen from the slide it is placed on. A client island. |
| `CarouselNav` | The region that lays out links that move to any slide. It states by name what it advances. |
| `CarouselLink` | A link that points to one slide. It receives the destination's `id` with a leading `#`. A client island. |
| `CarouselThumbnails` | The list of destinations that follows the slide being shown. It is `CarouselNav` with current-position tracking added, and is a client island. |

## Use Cases

- When one subject has several images that do not all fit side by side
- When you want to show a row of supplementary content without increasing the height of the main path
- When you want same-shaped cards to switch between one-at-a-time and several-at-a-time advancing according to the screen width

Not used when showing the whole list matters. A carousel is a display that assumes content placed out of view is not read, and content that must not be overlooked goes missing in it.

## Responsibility Boundaries

In the SSR-first selection it falls under `○`. Advancing works with CSS Scroll Snap and standard browser scrolling, so `Carousel` / `CarouselContent` / `CarouselItem` / `CarouselNav` have no `"use client"`, React state or browser API. Slide content is also output as Server Components and does not cross the client boundary.

### Only the advance actions are client islands

The client islands are four: `CarouselPrevious` / `CarouselNext` / `CarouselLink`, and `CarouselThumbnails`, which groups `CarouselLink`s and makes them follow the current position. The markup stays a link with an `href`, so pressing advances even before hydration, but a fragment navigation scrolls the whole page to bring the carousel into view and adds one history entry. After hydration the default action is stopped and only `CarouselContent` is advanced horizontally, so neither the page, the history nor the URL moves.

Presses with modifier keys, and cases where the destination slide does not exist, are left to the browser's default action.

Touch swipes and trackpad horizontal scrolling work from the start as browser scrolling. When a pointer-only means of advancing is needed, overlap `CarouselPrevious` / `CarouselNext` on the slide's left and right edges. These two can be pressed only within the slide they are placed on, so the destination is decided without tracking the current position. At an end with no destination, the element is not placed at all.

To prevent mis-presses, the hit area is a size larger than the visible circle: a transparent region the width of the circle's radius is added around it. This region overlaps the slide's content, so when placing links or buttons inside a slide, leave space around the circle. Overlapped actions cannot be pressed.

So as not to hide too much of the content, the surface and border are semi-transparent and become opaque on hover and focus. Only the surface and border are faded; the symbol is not made transparent. The image behind cannot be chosen, so fading the symbol too would lower contrast depending on the picture. Touch has no hover and is operated while semi-transparent, so the surface is not made any fainter.

They are repeated for every slide, so when there are many slides and `CarouselNav` provides keyboard destinations, pass `tabIndex={-1}` to take them out of the tab order.

**It does not own auto-advance, JS-driven drag, or infinite looping.** These need a playback timer or pointer tracking, and go beyond the split of moving only the advance mechanism to the client. Of the four conditions the catalog lists for a client island, the only one needed now is synchronized display of the current position.

### Making the list follow the visible slide

`CarouselThumbnails` builds `CarouselNav` inside it and adds current-position tracking. The structure as a list of destinations and the press-to-advance behavior remain those of `CarouselNav` / `CarouselLink`; all this component adds is "which one is being shown now".

Place it inside `Carousel`. What it observes is the first `CarouselContent` of the same carousel, and it picks the most visible slide with `IntersectionObserver`. The current `CarouselLink` gets `aria-current="true"` and is shown with text color and a border. The border is drawn as a border. A `ring`, which is drawn outside the element, would be clipped on the end items because the list is a horizontally scrolling surface, leaving only part of the ring as a line. A transparent border is always present, so the size does not change when the marker is applied. Only when that link overflows the list does it advance **only the list** horizontally. It does not move the page's scroll position. **Following only advances horizontally.** If the list is made into a vertical stack with `className`, the current marker moves but the list itself does not.

Position and spacing are decided with `className`. The spacing between thumbnails is `CarouselThumbnails`' `gap-*`, the spacing from the main area is `Carousel`'s `gap-*`, which side of the main area it goes on is `Carousel`'s `flex-*` (the default is `flex-col`, below), and the thumbnails' size and inner padding are `CarouselLink`'s `w-*` / `p-*`. It has no dedicated props. However, it traces what to observe from the same carousel, so **the list must be placed inside `Carousel`**.

The semantics are not APG's tabbed carousel (`tablist` / `tab` / `tabpanel`). That pattern assumes panels are swapped in and out, which does not fit this form where all slides exist and are shown by scrolling. It stays a set of in-page links and shows the current position with `aria-current`.

Before hydration, the marker appears only when `defaultCurrentId` is specified. A list that does not need to follow can stay as `CarouselNav`.

It does not own fetching content, controlling the number of slides, or building image URLs. The caller builds the content of `CarouselItem`, composing `MediaImage` for images.

The advance width is decided by `CarouselItem`'s `flex-basis`. `CarouselContent` has no width of its own, so the outer frame's width is given through `Carousel`'s `className`. `CarouselContent` leaves gaps between slides, so passing an evenly divided ratio as is makes the next slide stick out by the gap. To fit several exactly, pass the ratio minus a proportional share of the total gap (`calc(50% - 0.5rem)` for 2).

`Carousel` has `role="region"` and `aria-roledescription="carousel"`. A `section` becomes a region only when it has a name, so the role is stated explicitly. Always give `aria-label` or `aria-labelledby`. Entering a landmark with no name, you cannot tell what region it is. `CarouselItem` has `role="group"` and `aria-roledescription="slide"`, and shows its position, such as `1 / 4`, with `aria-label`. The number of slides in view is limited, so without a name you cannot tell where in the whole you are reading.

A scrollable region must be reachable by users who operate with the keyboard alone, so `CarouselContent`'s `tabIndex` is `0`. When the slide content consists only of focusable elements, pass `tabIndex={-1}` to remove it. Do not remove it for read-only content. The caller, who knows the content, decides; the default is the safe side, `0`.

Scrolling is not chained to the parent. If the whole screen moved after reaching the end of horizontal advancing, it would be unclear which one is being operated.

Do not give `CarouselContent` `scroll-behavior: smooth`. In a region with smooth scrolling specified, Chromium does not scroll on a fragment navigation. The advance actions rely on fragment navigation before hydration, so specifying it means nothing moves until hydration completes.

## Storybook and Tests

Storybook checks one-at-a-time advancing, adding links that point to slides, overlapping previous / next on the left and right edges, placing a following list below, changing that list's position, spacing and size with `className`, advancing while showing several side by side, content other than images, and removing the advance region's tab stop.

Tests check that it exposes a named region read as a carousel, that slides are exposed as `group`s with their position, that the advance region is reachable by keyboard and does not chain scrolling to the parent, that `tabIndex={-1}` removes the region's own tab stop, that `flex-basis` changes the advance width, that links are exposed as a named set, that links point to slides that exist, that the edge advances point to adjacent slides and are not placed at the ends, that their names can be reworded, and automated a11y checks.

For the client islands of the advance actions, separate tests check that a press moves only `CarouselContent` horizontally without causing a fragment navigation, the direction back after advancing to the end, that presses with modifier keys and the case with no destination are left to the default action, and that the caller's `onClick` is called first and nothing advances if it stops there.

For the following list, they check the marker before hydration with and without `defaultCurrentId`, that what is observed is the main area's slides, that the marker moves to the most visible slide, that slides with no report are treated as not visible, how the list advances when the current link fits and when it overflows to the left or right, the case with no corresponding link, the case with no observable slides, and the case where it is placed outside `Carousel`.

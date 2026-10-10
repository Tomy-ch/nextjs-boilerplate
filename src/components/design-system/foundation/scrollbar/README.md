# Scrollbar

## Purpose

Defines in one place the scrollbar look shared by every scrolling surface. In a local scroll area, the scrollbar is the cue that "this is an area that scrolls separately".

## Role and Public Components

There is no public React component. It is a CSS foundation that `scrollbar.css` declares on `:root`. It is imported from `globals.css`, and consumers need to specify nothing.

| Declaration | Role |
| --- | --- |
| `scrollbar-width: thin` | Unifies the scrollbar thickness. |
| `scrollbar-color` | Makes the thumb `muted-foreground` and the track transparent. |

## Use Cases

- Scrolling of the page body
- Local scroll areas through `ScrollArea`
- Any element with `textarea` / `pre` / `overflow`

None of them needs an individual specification.

## Responsibility Boundaries

`scrollbar-color` and `scrollbar-width` are **inherited properties**. Declaring them once on `:root` reaches every scrolling surface beneath, so they are not given per component. Specifying them on the component side would split the scrollbar look from place to place within the same app.

Giving a value other than `auto` switches overlay scrollbars to classic. With the defaults on macOS and touch environments, the scrollbar does not appear until scrolling, so the existence of a local scroll area goes unnoticed. Showing it at all times makes the area's existence, remaining amount and current position clear before it is touched. These three are derived from the scroll position, so unlike a static icon or decoration, the display never drifts from reality.

The trade-off is that classic scrollbars take up width and override the overlay setting the user chose in the OS. In UI where an independent scrolling surface appears within the page, nothing else indicates its existence, so this override is accepted.

In browsers that do not support it, the browser's default scrollbar is used as is. The display neither disappears nor shows a wrong state, and nothing regresses from the current situation.

It owns no preservation of scroll position, end detection or loading more. The size and direction of the area are the job of `ScrollArea`.

`html` declares `scrollbar-gutter: stable` to reserve the space even when no scrollbar is shown. When a classic scrollbar appears or disappears, the content width changes by that much, and the moment an overlay covering the surface stops page scrolling, everything moves along with the wrap points. This declaration is not inherited, so once the same horizontal shift becomes a problem in a local scroll area, specify it on that area.

## Storybook and Tests

Storybook checks that the same look reaches local scrolling through `ScrollArea`, the native elements `textarea` and `pre`, and horizontal scrolling, without any specification.

It is CSS only with no JavaScript, so there is no unit test. Rendering of the scrollbar is done by the browser and the OS and cannot be reproduced in jsdom.

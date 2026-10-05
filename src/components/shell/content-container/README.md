# ContentContainer

## Purpose

Aligns the reading width and horizontal padding of the page body.

## Role and Public Components

| Component | Role |
| --- | --- |
| `ContentContainer` | Frame inside `main` that decides the maximum width and horizontal padding of the contents. |

## Use Cases

Wrap the page contents in this frame first, before building them. If each page wrote its own reading width and padding, the `max-w-*` and `px-*` specifications would multiply with every page added and stop matching.

To change the width or padding, override with `className`. The same applies when adding a background, as in the story's `Default`.

## Responsibility Boundaries

**It holds only width and horizontal padding.** It does not hold vertical spacing, columns, background or borders. The side building the contents decides those.

The `main` element itself is the app shell's responsibility; this component does not render `main`. The shell's `main` keeps full width without narrowing. If both held width, it would be managed in two places and would have to be stripped later.

Only one reading width is provided. There are situations where wide tables or figures need a different width, but that is **decided when that screen requires it**; variants are not created in advance.

It can be used as a Server Component. No hydration is needed.

## Storybook and Tests

Storybook covers the default composition and how it looks on a viewport narrower than the reading width. The background color is set by the story to show the frame's extent; the component itself has no background. The tests cover centering and the reading-width specification, owning the horizontal padding, not rendering `main` and handling only the inside of where it is placed, and accepting `className`.

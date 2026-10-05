# Surface

## Purpose

The foundation for applying a design token **family** (`user` / `admin`) to a subtree. The switching mechanism itself belongs to the token side (`tokens/themes/<family>/<color scheme>.json` and the generated artifacts); what this holds is only **where the attribute goes**.

> It is spelled `surface`, but it is called a "family". "Surface" is used across the repo as the word for the surface that `bg-*` paints; the basis is [`tokens/README.md`](../../../../../tokens/README.md) "There are two switching axes".

## Role and Public Components

| Component / type | Role |
| --- | --- |
| `SurfacePortalBridge` | A client island that carries the subtree's family to the Portal's exit (`body`). It renders nothing. |
| `SURFACE` | The names of the non-default families. The default (`user`) has no attribute, so it is not included. |
| `SURFACE_ATTRIBUTE` | The name of the attribute that carries the family. |

## Use Cases

- Building the layout shell of a screen rendered with a different color scheme and typeface from the user-facing one, such as the admin side

## Responsibility Boundaries

**It holds no token values.** Which family has which colors, typefaces and glow is the SSOT of `tokens/themes/`, and components only re-read `--semantic-color-*`. **The components beneath need no changes.**

**It does not place the attribute itself.** Placing `data-surface` on the subtree's outer frame is the job of the layout shell (such as `AdminShell`). What this foundation takes on is only bridging to the places the attribute **does not reach**.

### Why a bridge is needed

`Dialog` / `Popover` / `DropdownMenu` / `Sheet` / `Tooltip` / `ContextMenu` go out **directly under `document.body`** through Radix's Portal. Even with the attribute on the layout shell's outer frame, the overlay content falls outside it, so it is rendered in the default family even after the family is switched (`tokens/README.md` 「属性を置く場所は、Portal を含む位置でなければならない」).

The token side shows two options, "place it on the equivalent of `body`" or "point the Portal's `container` inside the family", and leaves the choice to the screen. This repository takes **the former**, with the following division.

| What is rendered | How the family is given | When it takes effect |
| --- | --- | --- |
| Body | `data-surface` placed on the outer frame by the layout shell | When the server renders. The switch never appears on screen |
| Overlay content | `SurfacePortalBridge` puts it on `body` | After hydration |

**The latter is sufficient even after hydration because overlays open through interaction.** They can only be opened after hydration, so there is no moment when the content is rendered in the default family. The option of replacing `container` was not taken because it would mean adding a hook-in point to the 6 overlay components and having callers specify it every time.

**It removes the attribute when unmounted.** If it stayed on `body` after leaving the subtree that has the family, the next overlay opened would be rendered in the previous screen's family.

## Storybook and Tests

In Storybook, the look of each family belongs to the `Tokens/*` catalog. This foundation renders nothing, so it has no story of its own. Switching is done from the preview globals (`surface`), which also place the attribute on the same `body`.

The tests check that the family is carried to the exit, that it disappears when unmounted, and that it renders nothing.

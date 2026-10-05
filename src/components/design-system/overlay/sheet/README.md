# Sheet

## Purpose

Opens auxiliary navigation or a filter surface as a modal panel that appears from an edge of the screen. On a narrow viewport with no room to show it permanently, it pulls the content in from off-screen only when needed.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Sheet` | Client-side root that manages the open state, focus trap, Escape, and making the background inert. |
| `SheetTrigger` | Trigger that opens the Sheet. When using a `Button` or a link, compose it with `asChild`. |
| `SheetContent` | Renders the sheet body fixed to the screen edge given by `side`, together with the overlay and the Portal. By default it places a close control at the top right. |
| `SheetClose` | Control that closes the sheet. Used for cancel or close in the footer. |
| `SheetHeader` | Region that groups the title and the description. |
| `SheetTitle` | Title that becomes the sheet's accessible name. Renders an `h2` by default. |
| `SheetDescription` | Body text explaining the purpose or content of the sheet. |
| `SheetFooter` | Region that lays out actions. It only handles placement and owns no actions itself. |
| `SheetOverlay` | Overlay that covers the background. `SheetContent` renders it internally. |
| `SheetPortal` | Portal the sheet renders into. `SheetContent` uses it internally. |

`SHEET_SIDE` and `SheetSide` are exported from `sheet.definition.ts`. This definition owns the values accepted by `SheetContent`'s `side`; callers do not write strings such as `"right"` directly.

## Use Cases

- On a narrow viewport, collapsing the header navigation and pulling it out from a trigger as a list
- Gathering a list's filter conditions into an edge surface without hiding the main flow
- Placing auxiliary information of variable height that should be pulled in from the top or bottom edge

To gather content in the center of the screen and draw attention to it, use `Dialog`; to confirm an irreversible action such as account closure or deletion, use `AlertDialog`, which carries `role="alertdialog"` semantics.

## Responsibility Boundaries

In the SSR-first selection it is rated `△`. The default is ordinary links and buttons with content assembled on the server; choose this client island when overlay open/close, focus management, Escape or animation become necessary. It needs hydration for the open state and the focus trap, and cannot be rendered directly from a Server Component. When the content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

While open it holds one history entry, and **the back action closes only itself** ([0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)). It pushes only a history entry for the same URL; the URL itself does not change.

It does not own the text it displays, fetching, saving, business decisions, or the choice of whether to put the open state in the URL. `side` decides only which screen edge it appears from; the feature owns the decision to switch between a sheet and a permanent display depending on viewport width.

`SheetContent` lays out its content in a vertical flex, and `mt-auto` on `SheetFooter` pushes the footer to the bottom edge when there is spare room. It does not handle scrolling when the content exceeds the sheet's height; when needed, the caller sets overflow through `className`.

`SheetFooter` only handles placement and does not render a close control of its own. The caller places the close control by composing `SheetClose` onto a `Button`.

`SheetContent` always has a `SheetTitle` child as its accessible name. When a description is needed, add `SheetDescription`; when not, set `aria-describedby={undefined}` explicitly. Radix warns when neither is present. When `showCloseButton` is set to `false`, always provide a closing means with `SheetClose` in the content.

The content is rendered into the Portal directly under `body`, but in the React tree it stays under the caller. A `form` placed inside the sheet submits normally, and its `name` / `value` become the submitted values as they are.

The vendor is currently Radix, but the public API carries no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`. The positioning and animation classes for `side` are kept exactly as shadcn generated them; since no animation plugin is adopted, no animation CSS is emitted at present.

## Storybook and Tests

Storybook covers the default open and close, the four fixed positions `right` / `left` / `top` / `bottom`, form components placed in the content as a filter surface, the case without a description, and the case without the top-right close control. Fixing to a screen edge and the look of the spacing can only be judged in a real render, so position and spacing are within Storybook's scope.

The tests cover that the content is not rendered until opened, the association of the title and the description, that the title renders as a heading, that the semantics are `dialog` rather than `alertdialog`, the fixed position by default and with `side`, closing from both the top right and the footer, toggling `showCloseButton`, closing with Escape, that a `form` inside the Portal keeps its submitted values, explicit use of `SheetPortal` / `SheetOverlay`, and the automated a11y check. The Portal target lies outside the render's `container`, so `baseElement` is passed to the automated a11y check.

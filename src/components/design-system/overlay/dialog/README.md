# Dialog

## Purpose

Opens auxiliary content views or ordinary edit operations as a modal covering the screen.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Dialog` | The client-side root that manages the open state, the focus trap, Escape and making the background inert. |
| `DialogTrigger` | The trigger that opens the Dialog. When using `Button` or a link, compose it with `asChild`. |
| `DialogContent` | Renders the dialog body together with the overlay and Portal. By default it places a close action at the top right. |
| `DialogClose` | The action that closes the dialog. Used for cancel / close in the footer. |
| `DialogHeader` | The area that groups the title and description. |
| `DialogTitle` | The title that becomes the dialog's accessible name. |
| `DialogDescription` | The body text explaining the dialog's purpose or effect. |
| `DialogFooter` | The area that lays out actions. It handles only placement and holds no actions itself. |
| `DialogOverlay` | The overlay covering the background. `DialogContent` renders it internally. |
| `DialogPortal` | The Portal it renders into. `DialogContent` uses it internally. |

## Use Cases

Use it where content should be checked or edited without a screen transition, such as opening a detail from a list, editing a name or setting, or enlarging an image.

Do not use it to confirm operations that cannot be undone, such as account cancellation or deletion. For that, use `AlertDialog`, which has the semantics of `role="alertdialog"`.

## Responsibility Boundaries

While open it holds one history entry, and **the back action closes only itself** ([0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)). It pushes only a history entry for the same URL; the URL itself does not change.

It is a client island that needs hydration for the focus trap, Escape, opening / closing and making the background inert. It owns no display text, fetching, saving, business decisions, or the choice of whether to put the open state in the URL. When the content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

`DialogFooter` handles only placement and does not render a close action itself. The caller places the close action by composing `DialogClose` with a `Button`. The footer-side `showCloseButton` in the shadcn generated output is not adopted, because it duplicates the close action of `DialogContent` and brings text into the component.

`DialogContent` always has a `DialogTitle` as a child for its accessible name. Add a `DialogDescription` when a description is needed, and specify `aria-describedby={undefined}` explicitly when it is not. Without either, Radix warns.

The surface overlaps the page content, so it is rendered opaque with the semantic tokens `bg-background` for the background and `border-border` for the border. For a class not defined in the tokens, Tailwind outputs no CSS, and the surface stays transparent, overlapping the text behind it and losing contrast.

The vendor is currently Radix, but the public API contains no vendor name. Icons come from [`icon.ts`](../../../icon.ts) in `components`.

## Storybook and Tests

Storybook checks the default opening / closing, the title, description and footer in the open state, placing form components in the content, having no description, and not placing the top-right close action. The tests check that the content is not rendered until opened, the association of title and description, that the semantics are `dialog` rather than `alertdialog`, that the surface is opaque, that it can be closed from both the top right and the footer, toggling `showCloseButton`, closing with Escape, explicit `DialogPortal` / `DialogOverlay`, and the automated a11y check.

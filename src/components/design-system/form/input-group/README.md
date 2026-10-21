# InputGroup

## Purpose

Fits unit symbols, icons and auxiliary actions into one continuous frame with the input, making it clearer than placing them outside the input "which input the information belongs to".

## Role and Public Components

| Component | Role |
| --- | --- |
| `InputGroup` | The outer frame that encloses the input and addons as one continuous frame. Carries the border, rounded corners, focus indicator, invalid indicator and disabled indicator. |
| `InputGroupAddon` | The area placed before / after or above / below the input inside the frame. `align` selects `inline-start` / `inline-end` / `block-start` / `block-end`. |
| `InputGroupText` | A string placing a unit, symbol or short description inside an addon. |
| `InputGroupButton` | An auxiliary action button sized to fit inside the frame. Comes in `xs` / `sm` / `icon-xs` / `icon-sm`. |
| `InputGroupInput` | A single-line input that leaves its frame to the outer frame. |
| `InputGroupTextarea` | A multi-line input that leaves its frame to the outer frame. |

`input-group.definition.ts` exports the sets of values `align` / `size` accept as `INPUT_GROUP_ADDON_ALIGN` / `INPUT_GROUP_BUTTON_SIZE`.

## Use Cases

- Adding a unit symbol to an input for a value with a unit, such as a quantity or a percentage
- Fitting a search icon at the start of a keyword input and run / clear actions at the end
- Stacking a row of input descriptions or auxiliary actions above or below a multi-line input

For supplementary text that makes sense outside the input, use `FieldDescription` of `Field`. The item name of the input itself is given by `Label` / `Field`.

**Put text that prompts input in `placeholder`.** Placed in an addon, the string sits in the same frame as the input area and is read as something that disappears once you type. Put in an addon only information that does not disappear when typing (units, notation hints, auxiliary actions).

## Responsibility Boundaries

In the SSR-first selection it is `△`. The default is to assemble `Input` / `Textarea` and `Label` / `Field` as Server Components; choose this component once it is settled that symbols or actions must fit **inside the input's frame**. `InputGroupAddon` delegates focus from where it was pressed to the control inside the frame, so it needs hydration and cannot be rendered directly from a Server Component. When the addon's content itself needs no client runtime, pass elements assembled in a Server Component as `children`.

It holds no value state, validation, submission or error text. It only takes `aria-invalid` and changes the outer frame's display; the feature decides whether it is invalid.

**Addons in the block direction (`block-start` / `block-end`) draw a separator line by default.** They are separate rows stacked above or below the input, and without a line they look continuous with the input area. The inline direction (`inline-start` / `inline-end`) fits on the same row as the input, so no line is drawn. To remove the line, pass `border-b-0` / `border-t-0` to the addon.

**Controls inside the frame have no focus indicator of their own.** The focus indicator is drawn with `outline`, so `InputGroupInput` / `InputGroupTextarea` cancel it on the `outline` side. Cancelling `ring` does not remove it, and it doubles up with the outer frame's ring.

The outer frame derives three things from the control's state: focus, invalid and disabled. The border reacts to the control's `disabled` and drops to a subdued color, so the caller needs no extra specification. Pass `disabled` to the outer frame only when the addons should dim at the same time. Both `data-disabled`, which creates the dimmed look, and `aria-disabled`, which tells assistive technology that the whole frame is not operable, are set.

The frame of `InputGroupInput` does not grow or shrink with its content. The focus and invalid rings are both drawn as shadows, and the border changes only its color without changing its width, so the surrounding layout does not move when the state changes. Layout moves on invalid only when the feature adds error text, and the amount it grows is the height of the text itself.

Only `InputGroupTextarea` grows in height with its content, and the outer frame follows it. Placed where row heights are aligned, such as a table cell, it pushes its surroundings down, so choose the single-line `InputGroupInput` there.

The outer frame and addons carry `role="group"`. Both are unnamed groups; give the input its accessible name separately with `htmlFor` on `Label` or with `aria-label`. Addon symbols and icons are decorative and are neither the control's name nor its description. `InputGroupAddon` itself does not receive focus; keyboard users reach the control directly with tab. To place an action in an addon, use `InputGroupButton`, and when it is icon-only give it a name with `aria-label`.

The default of `InputGroupButton` is `type="button"`, so it does not submit even inside a form. Specify `type="submit"` only when it should submit, such as running a search.

It uses no external interaction library; it only uses `class-variance-authority` for variant definitions. Focus delegation from an addon to the control is done by a DOM scan that looks for `data-slot="input-group-control"`.

## Storybook and Tests

Storybook checks a unit addon, a leading icon, addons on both sides, the four button sizes, stacked placement above and below with multi-line input, `aria-invalid`, and disabled shown three ways side by side: operable, only the control `disabled`, and the whole frame `disabled`.

The tests check the group structure, the accessible name via `Label` and the description via `aria-describedby`, that `align` is reflected, focus delegation from an addon to both single-line and multi-line controls, that pressing a button inside an addon does not steal focus, that nothing happens for a frame without a control or for an addon placed outside the frame, that the button by default does not submit the form, that `name` and value are submitted with `type="submit"`, propagation of native attributes and `disabled` / `aria-invalid`, and the automated a11y check.

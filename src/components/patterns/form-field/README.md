# FormField

## Purpose

Builds the field name, the required marker, the input, the supplementary note and the error in the same order for every kind of input.

## Role and Public Components

| Component | Role |
| --- | --- |
| `FormField` | The outer frame. It builds the label and the required marker, and places the note and the error below the input passed as children. |

`fieldControlAttributes()` (`field-attributes.ts`) is a pure function that builds the a11y attributes given to the input itself. The outer frame calls it and passes the result to children. Callers do not use it directly.

## Use Cases

Use it for forms that lay out several fields. Text, select, or a composite of an input and an action alike are slotted
into the same outer frame.

Do not use it where there is only one input with neither a note nor an error. Placing `Label` and the control side by side directly
reads better.

## Responsibility Boundaries

**It does not own the input.** It receives it as children. If an outer frame were made per kind, the position of the error and of the required
marker would drift per kind.

**It does not generate the `id`.** It would collide when the same form is placed twice in one document, so generation is done by
the caller, which can hold `useId()`. This component only distributes the received `id` to the label and the error.

**The input's ARIA attributes are passed to children.** It does not receive the input itself, so it cannot touch it directly,
but it builds `aria-invalid` / `aria-describedby` / `aria-required` / `id` and passes them as the children argument, so
**the caller only spreads them onto the input**. What the outer frame itself owns goes only as far as switching the look through
`data-invalid`.

**The caller is not made to build them.** If it were, a screen could use just the outer frame without passing the attributes through.
`aria-invalid` is kept as `false` rather than dropped even with no error because, if the attribute disappeared entirely,
assistive technology could not distinguish it from "never validated". What to give is decided in one place,
`fieldControlAttributes()`.

**It does not generate the `id`s of the error and the note either** — they are derived from `controlId`. The suffix spelling is owned by
[`design-system/form/field`](../../design-system/form/field/field.definition.ts)
(`toErrorId` / `toDescriptionId`). `FieldDescription` / `FieldError` are what receive the `id`, so the
convention sits next to them. If it were placed here, catalogs and screens that build a plain `Field` directly could not reach it and
would write the same spelling by hand.

**Passing the note to the outer frame is enough.** The outer frame takes on both rendering it and pointing to it from the input. When both a note and an error
are present, they are listed in `aria-describedby` in render order (note → error).

```tsx
<FormField controlId={id} description={description} label="メールアドレス" message={message} required>
  {(control) => <Input {...control} {...register("email")} />}
</FormField>
```

It owns neither validation nor the decision of whether a field is required. The caller derives both from the validation schema and passes them
([0062](../../../../docs/adr/0062-form-input-validation.md)).

It also does not own when to show an error (when focus leaves, or on every change). It receives only the result of deciding
whether to show it, through `message`.

## Storybook and Tests

Storybook shows required, optional, with an error, with a note, and with a select slotted in. The tests cover the association of the label and
the input, that no error element is rendered when there is no error, **that the built attributes are passed to children**,
and the automated a11y check. Separately, `fieldControlAttributes()` is checked for switching `aria-invalid` and
`aria-describedby` depending on whether there is an error, for listing both ids in render order when a note and an error are both present, and for
emitting required as an attribute.

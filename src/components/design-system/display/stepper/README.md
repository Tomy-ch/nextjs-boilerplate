# Stepper

## Purpose

Lists a known, finite set of stages in their defined order and shows the current position and the stages not yet reached.

## Role and Public Components

| Component | Role |
| --- | --- |
| `Stepper` | The `ol` that lists the stages. Takes the name of the progress as `label` and the direction to lay them out as `orientation`. |
| `StepperItem` | One stage. `state` indicates its position, and `current` gets `aria-current="step"`. |

`stepper.definition.ts` is the owner of `STEPPER_STATE` (`complete` / `current` / `upcoming`), `STEPPER_STATE_LABEL`, `STEPPER_ORIENTATION` (`vertical` / `horizontal`) and `STEPPER_PASSED_CURRENT_LABEL`.

The content is built with `ListItemContent` / `ListItemTitle` / `ListItemDescription` from [`List`](../list/README.md). `List` already holds the vertically stacked rows, the leading marker, and the title and description, so they are not rebuilt here.

**The default orientation is vertical.** Giving `orientation` the value `horizontal` lays the stages out side by side and wraps whatever does not fit. When there are few stages with short names, the progress can sit above the input fields. Both orientations use the same elements; only the layout changes.

## Use Cases

Use it to show progress whose **stages are fixed in advance**, such as an application, a registration or an approval.

```tsx
<Stepper label="申請の進捗">
  <StepperItem marker={1} state={STEPPER_STATE.COMPLETE}>
    <ListItemContent>
      <ListItemTitle>申請</ListItemTitle>
    </ListItemContent>
  </StepperItem>
</Stepper>
```

## Responsibility Boundaries

**It owns neither the definition of the stages, whether a transition is allowed, nor the next available action.** The caller decides how far things have progressed; this component only renders the `state` it receives.

It is a separate component from `ActivityTimeline`. Both look like items stacked vertically, but their premises differ.

| | `Stepper` | `ActivityTimeline` |
| --- | --- | --- |
| Subject | Known, finite stages | A history of unknown length |
| Focus | The current position and the stages not yet reached | What happened in the past |
| Order | Defined order. Does not grow or shrink | Time order. Keeps growing |
| Semantics | `ol` + `aria-current="step"` | `ol`. Has no `role="feed"` |

**"The next available action" and pagination do not live together.** The former assumes finite stages and the latter an unbounded history, so putting both into one component breaks under either premise.

**Keep exactly one `current` within a `Stepper`.** With more than one, the current position is undefined.

**Having completed something and where you are now are separate facts.** Returning to a stage already passed makes it `current` again, but its input is already done. Giving `passed` turns only the marker into the same check as `complete`, while `state` remains `current`. Screen reading announces `STEPPER_PASSED_CURRENT_LABEL` (default 「現在の段階・完了」, "current stage, complete"). Do not substitute by setting `state` to `complete` — the current position disappears.

**Always give the progress a name.** When a screen has several progress indicators, without a name it is unclear which one is which.

The marker is decorative. It shows a check for `complete` and otherwise the number passed in `marker`. **Color and the marker alone do not reach assistive technology**, so each stage carries a word describing its state as screen-reader-only text.

These words default to 「完了 / 現在の段階 / 未着手」 ("complete / current stage / not started", `STEPPER_STATE_LABEL`), but can be replaced with `stateLabel` on `StepperItem`. Use it to align with stage names that are already fixed, such as 「承認済み」 ("approved") or 「差し戻し」 ("returned"). **An empty string stops the state from being conveyed**, so when replacing, give a different word.

`STEPPER_STATE` is the identifier emitted to the `data-state` attribute and `STEPPER_STATE_LABEL` is the text that is read out; their roles differ.

It can be used as a Server Component. No hydration is needed.

## Storybook and Tests

Storybook checks a partially progressed state, a not yet started state, a fully passed state, stages without a description, stages without a number, and state words replaced with stage names. The replacement is screen-reader-only and does not appear visually, so its actual behavior is pinned down by the tests. The tests check that the stages are listed as a named `ol`, that only the current position gets `aria-current`, that the state is also given as a word for screen reading, that passed stages show a check instead of a number, that even the current position shows `passed` both in the marker and in screen reading, that omitting `state` means not started, that `stateLabel` replaces the word, that the marker frame remains when `marker` is omitted, that the horizontal layout is also reflected in an attribute, that it has no actions, and the automated a11y check.

# WizardForm

## Purpose

A frame for input split into several steps. It divides input that would be too much to show at once — an application, a registration, a setup — into steps.

## What It Holds

**Only which step you are on now, and moving between steps.**

| Holds | Does not hold |
| --- | --- |
| Keeping the current position, moving back and forth, jumping straight to reached steps | Each step's fields |
| Showing progress (composing `Stepper`) | Validation rules |
| Each step's heading and region | Submission |
| Swapping the action on the last step | Saving partway |

The caller decides whether the user may proceed and passes the result as `blocked`. Validation itself does not enter this component.

If steps are removed and the current position falls outside the sequence, **it starts over from the first step**. It also does not keep the record of reached steps — reach is counted by position, and for a position after the sequence has changed, one cannot say that step was passed through.

The text of the forward action is one for the whole wizard (`nextLabel`), but giving a step its own `nextLabel` rephrases only the destination from that step. Give it only on steps where the destination means more than "the next step" (such as the second-to-last step proceeding to confirmation).

```tsx
<form action={submitApplication}>
  <WizardForm
    label="利用申請"
    steps={[
      { id: "applicant", title: "申請者", content: <ApplicantFields />, blocked: !isNameFilled },
      { id: "confirm", title: "確認", content: <Confirmation /> },
    ]}
    submit={<Button type="submit">申請する</Button>}
  />
</form>
```

## Only reached steps are built, and they stay in the DOM afterwards

**The contents of steps not yet reached are not built.** A step that has once been the current position is only hidden with the `hidden` attribute when left, and **is not unmounted**.

Building waits until a step is reached so that opening the wizard does not pay for every step. For a step whose contents include a `next/dynamic` component, fetching that chunk starts when it mounts (ADR [0101](../../../../docs/adr/0101-performance-budget.md)). Steps with inputs and read-only steps are treated the same. If a step was not rendered before being reached, there are no values and no bytes paid; once reached, they have already been paid.

Reached steps are not unmounted so that submitting with `<form action>` does not drop the input values of other steps. With `hidden`, the values stay in the form while the step drops out of assistive technology and layout. `display: none` is not applied through a class, because the purpose is to keep the values.

Thanks to this property, submission can happen once, on the last step, for all steps together. ADR [0061](../../../../docs/adr/0061-form-mutation-ux.md)'s `<form action>` + `useActionState` can be used as is.

**The submission has the values of every step because every step passes through the current position at least once.** "Next" advances only one step at a time, and the steps reachable from the progress indicator are limited to those already reached. If jumping to unreached steps were allowed, the values of unbuilt steps would not be sent.

## Focus moves when the step changes

Focus moves to the region of the destination step. Otherwise focus stays on the pressed button, and keyboard and screen-reader users are not told what changed.

**It does not move on first display.** Taking focus right after opening would skip over the preceding context.

A step is a set of form controls, so it is represented as a `fieldset`, with the step name given as its `legend`.

## Progress

`Stepper` is composed **horizontally**. It owns the sequence of steps, `aria-current="step"` for the current position, and distinguishing passed from unreached steps. The progress indicator's name becomes "〈label〉の進捗" ("progress of 〈label〉"). It is not stacked vertically because that would push the area above the inputs down by the number of steps, making the user scroll before starting to enter anything.

**Any step reached at least once can be visited directly from the progress indicator.** There is no reason to make the user retrace in order, and going back from the confirmation step to fix one place takes the shortest path. Steps not yet reached cannot be pressed — `blocked` owns the decision of whether the user may proceed, and being able to skip ahead would bypass that decision.

**While the current step cannot be completed, steps ahead cannot be reached from the progress indicator either.** Stopping only "Next" means nothing if the progress indicator still allows jumping. Going back is not stopped — going back does not claim the step was completed.

Whether a marker appears and whether a step can be pressed are separate conditions. **There are steps that were reached but not passed**; they can be visited but get no marker. Conversely, returning to a completed step keeps its marker even while it is the current position (`Stepper`'s `passed`).

## Responsibility Boundaries

The caller owns submission. On the last step it only places the element passed as `submit` instead of "Next"; this component does not submit.

It also does not own saving partway. If needed, the caller does it in the same place it computes `blocked`.

When leave prevention is needed, use [`unload-guard`](../../app-starter/unload-guard/README.md) and [`navigation-guard`](../../app-starter/navigation-guard/README.md) together.

## Storybook and Tests

Storybook covers a three-step application, a case with only two steps, swapped text, and the caller deciding whether the user may proceed. The tests cover the initial position, that steps not displayed drop out of assistive technology, that the contents of steps not yet reached are not built, the current position in the progress indicator, moving back and forth, that the first step cannot go back, swapping the action on the last step, `blocked`, that the values of hidden steps stay in the form, moving focus and not taking it on first display, swapped text and per-step `nextLabel`, jumping straight to reached steps from the progress indicator, not jumping to unreached steps or past `blocked`, that a returned-to step keeps its marker, starting over from the first step when steps are removed and the current position falls outside the sequence, that submission belongs to the caller, and the automated a11y check.

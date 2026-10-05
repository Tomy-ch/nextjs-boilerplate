# Reading Input and Submission

This document explains **end to end** what happens from the moment text enters an input field, through the Server Action returning a result, to that result appearing on screen. The submission mechanism belongs to [ADR 0061](../adr/0061-form-mutation-ux.md), the two tiers of validation to [ADR 0062](../adr/0062-form-input-validation.md), how results are shown to [ADR 0063](../adr/0063-mutation-result-notification.md), the input-state library to [ADR 0060](../adr/0060-state-management.md), and the path for file attachments to [ADR 0075](../adr/0075-file-upload-seam.md). The rules enforced day to day are in [`docs/rules.md`](../rules.md#forms).

What this page holds is **the background needed to read them** and **where in the implementation each thing lives**. It makes no copy of the rules. When in doubt, the ADR wins.

## Terminology

| Term | Meaning | Common confusion |
| --- | --- | --- |
| **Server Action** | An async function marked `"use server"` that is passed to `<form action>`. It is **a public HTTP endpoint**: anyone who knows the action id can call it without going through the screen | It is not "a function behind the screen". Even if the screen that renders it is protected, the action itself is not |
| **`FormData`** | The pairs of `name` and value that a `<form>` collects. The only input a Server Action receives | It is built from **the DOM's current values**, not from React state. A value not in the DOM does not arrive |
| **`ActionState<T>`** | The **discriminated union** of results a Server Action returns to the screen (`idle` / `success` / `error`) | It is a value, not an exception. Neither `Error` nor `Date` survives the round trip |
| **Display validation** | The hand-written schema in `model`. Judges each field's required-ness, format and length, with human-facing messages | It is not the wire contract. It may be narrower than the contract |
| **Contract validation** | The generated schema checking the shape of responses and requests at the `adapters` boundary | It never reaches the screen. Only the classification does |
| **Idempotency key** | The key that folds a resubmission from the same screen into a replay of the first one | It is not a secret. The screen, which decides the unit of submission, creates it |

## What Happens in One Submission

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Server Action
  participant P as Input parser
  participant D as adapters
  B->>B: Validation before sending (display validation, for UX)
  B->>A: POST the FormData
  A->>P: Parse FormData (runs the same display validation again)
  P-->>A: Settled values or per-field errors
  A->>D: Request the change
  D->>D: Contract validation (generated schema)
  D-->>A: Success or a classified exception
  alt Stay on the screen
    A-->>B: ActionState (value)
    Note over B: useActionState replaces the state and the form is reset
  else Move to another screen
    A-->>B: redirect() (throw)
    Note over B: No state comes back; the client router navigates
  end
```

There are three points to hold on to in the order.

1. **Validation happens three times.** Before sending (the browser), after receiving (the same schema again inside the Server Action), and at the boundary going outward (contract validation in `adapters`). The first is for the experience, the second is authoritative, and the third is the contract's stronghold; their roles differ, so none can be skipped
2. **A Server Action returns failure as a return value.** The only thing that ends by throwing is `redirect()`, and that is the signal of success
3. **When the action finishes, the `<form>` is reset.** This happens on success and on failure alike (see below)

## The Three Hooks and the Tree Each One Sees

| Hook | Returns | Where it works |
| --- | --- | --- |
| `useActionState(action, initial)` | `[state, formAction, isPending]` | The component that renders `<form action={formAction}>` |
| `useFormStatus()` | `{ pending, data, ... }` | **Inside a parent `<form>`**. The component that renders the form cannot read it itself |
| `useOptimistic` | An optimistic provisional value | Not used. If used, only where a rollback can be held ([`docs/rules.md`](../rules.md#forms)) |

`useFormStatus` reads the submission state of "the nearest `form` that wraps me". So a button that shows the submitting state is **split out as a child** of the component that renders the `form`. In the bundled sample, every feature has that child in `ui/submit-button/`, which only passes it to `Button`'s `pending`.

How the submitting state looks is held by `pending` in [`components/design-system/action/button`](../../src/components/design-system/action/button/button.tsx). It sets `disabled`, raises `aria-busy`, hides the text **while keeping its space**, and replaces the name with `aria-label={pendingLabel}`. The text is not replaced because the width would move; the name is replaced because the name that was built from the now-hidden text disappears.

**`isPending` and `useFormStatus().pending` are different values.** The former is the state of one submission held by `useActionState`; the latter is per-form state. If the same submit area is rendered in two places on a screen (shown or hidden by band width, but both present in the DOM), `useFormStatus` makes the visible one look like "nothing is being sent". Such a screen distributes `isPending` through Context and does not use `useFormStatus`.

## Who Holds the Input Values

`<form action>` **calls `form.reset()` when the action finishes**. React schedules the reset when the action starts and runs it at the commit that ends the transition. It happens even when the return value is `error`. An uncontrolled input field (one whose `value` React does not hold) loses what was typed after a rejected submission.

Because of this property, input takes one of three shapes.

| Shape | Who holds the value | Suited to |
| --- | --- | --- |
| **Buttons and hidden fields only** | Nobody. `<button name value>` and `<input type="hidden">` carry the value of what was pressed | One action, one submission. Increment / decrement, delete, advance a state by one |
| **react-hook-form** | rhf's internal state and the DOM. `register` is uncontrolled | Multiple fields + validation + error display |
| **Holding every field as a string in `useState`** | The screen. Input fields are controlled fields that receive `value` | When judgments are written as functions rather than zod, and you do not want to rebuild the fields on every submission |

**rhf does not replace the submission mechanism.** It does not call `handleSubmit`; `register` wires the fields, and the `FormData` flows to `<form action>` unchanged. All rhf holds is validation during input. Even where JavaScript does not run, the form is submitted and the same schema validates it on the Server Action side.

When using rhf, the wiring is as follows.

- **`useForm`'s `resolver` is `standardSchemaResolver`.** Display validation schemas are written in `zod/mini` ([ADR 0029](../adr/0029-type-design-discipline.md)), so `zodResolver`, which requires `zod` types, cannot connect. `zod/mini` implements Standard Schema, so connect through the standard side's entry
- **Give `defaultValues` to every field.** A field that is `undefined` is treated as uncontrolled, and on the first submission the field itself is missing. If there is no value yet, put an empty string
- **`mode: "onTouched"`.** This setting re-checks, on every change, a field that has lost focus once; `reValidateMode` only takes effect after submit

## The Two Tiers of Validation and Which One Is Authoritative

| Tier | What it judges | Location | Style | Where it reaches |
| --- | --- | --- | --- | --- |
| **Display validation** | Required, length, format. Carries human-facing messages | `src/model/<domain>/*-schema.ts` | `zod/mini` | **Both** the browser (resolver) and the Server Action (the parser) |
| **Contract validation** | Whether requests and responses have the contract's shape | `src/adapters/gen/api/endpoints.zod.ts`. Enforced in [`adapters/server/http/request.ts`](../../src/adapters/server/http/request.ts) | `zod` | Server only. Only the classification returns to the screen |

**What is authoritative is the display validation re-run on the Server Action side.** The browser-side judgment exists to answer immediately, and the sender can replace it. The same schema runs on both sides to keep the judgment and the messages in one place, not because the browser side is trusted.

**When using a contract-derived limit in the browser, import the constant, not the generated schema.** `src/adapters/gen/api/limits.ts` copies only the constants from the generated artifacts that do not reference zod, and the client imports only this. Importing the schema itself ships the generated artifacts for every endpoint to the browser ([ADR 0072](../adr/0072-api-type-generation.md)).

**A rejection where the connection target names a field is mapped into the same shape as display validation.** The `details` the contract returns hold only field names and no reason, so the message can only be written in the form 「〈項目名〉は受け付けられませんでした」 ("〈field name〉 was not accepted"). Names that do not correspond to an input field on this screen are discarded — using them as keys creates a "there is a field error" state whose message appears nowhere. The destination of the mapping is `fieldErrors` in `ActionState`, so the screen can show it the same way without knowing whether it was rejected before sending or by the connection target.

**Display validation need not be zod.** Writing the judgment as a function (`(value: string) => string | undefined`) that the sending and receiving sides both call keeps the same principle (judgment and messages in one place). zod is not used only on screens that carry every value around as strings and need no type inference from a schema.

### When to Show Errors

**Running** validation and **whether to show** its result are separate concerns. A hook that holds only the latter (`use-error-visibility.ts` in the bundled sample) caps a focused field at "the message that was showing when it received focus". Fixed, it disappears; not fixed, the message does not change; and no **new** error appears while focused. rhf's settings alone cannot satisfy this ([ADR 0062](../adr/0062-form-input-validation.md) explains why the rhf settings fall short).

The required marker is derived from the schema. If you judge by passing an empty string through the schema to see whether it fails, rather than listing fields, you cannot end up with a marker that remains after the rule was relaxed.

### Who Builds a Field's a11y Attributes

| Component | Holds |
| --- | --- |
| [`patterns/form-field`](../../src/components/patterns/form-field/README.md) | The field label, the required marker, the hint, and the list of errors. `fieldControlAttributes()` builds `aria-invalid` / `aria-describedby` / `aria-required` / `id` and **passes them as the argument to children**. The caller only spreads them onto the input field |
| [`design-system/form/field`](../../src/components/design-system/form/field/README.md) | The `Field` set, and the spelling of the hint and error `id`s (`toErrorId` / `toDescriptionId`) |

Neither generates the `id`. Placing the same form twice in one document would duplicate it, so the caller, which can hold `useId()`, creates the prefix.

## Presenting the Result

`ActionState<T, TField>` ([`src/model/action-state.ts`](../../src/model/action-state.ts)) takes the following three forms.

| Form | Holds |
| --- | --- |
| `idle` | Nothing. The initial value of `useActionState` |
| `success` | `value: T` |
| `error` | `formError` (the message for the whole form; `null` if none) / `fieldErrors` (per field; can hold several messages) / `kind` (the [`ErrorKind`](../../src/errors/error-kind.ts) classification) |

`actionStateFromError` maps a thrown error into `error`, using the message the `errors` catalog holds for each classification. Only for classifications that need wording specific to the screen (`CONFLICT` and the like) does the Server Action return its own message with a `kind`.

**The signal for what to show is `kind`, not the message.** "On a conflict, add a path to reload" is judged by `state.kind === ErrorKind.CONFLICT`. The message may change freely; adding dynamic elements to it does not make the path disappear.

When to use which means belongs to [ADR 0063](../adr/0063-mutation-result-notification.md). Where each one lives is below.

| Means | Component | Notes |
| --- | --- | --- |
| Inline (whole form) | [`app-starter/form-feedback`](../../src/components/app-starter/form-feedback/README.md) | Uses `Alert`. Insert the next action (such as a path to reload) in `children` |
| Inline (summary) | [`app-starter/form-validation-summary`](../../src/components/app-starter/form-validation-summary/README.md) | For forms with many fields, shown **together with** the per-field messages. Links point at the field `id`s |
| Inline (per field) | `FieldError` | Passed to `FormField`'s `message` |
| toast | [`shell/toaster`](../../src/components/shell/toaster/README.md) | Calls `useToast().toast()` in an effect on `state.status === "success"` |
| redirect | The Server Action's `redirect()` | A success state never appears on screen. It becomes `ActionState<void>` |

**An action that ends in `redirect()` "does not return".** It throws on success, so there is no branch that returns `success`. That screen's `ActionState` therefore holds no success value and has no success display. In tests, the throw on success is placed in the normal cases ([`docs/testing-conventions.md`](../testing-conventions.md#what-goes-where)). When confirming from inside an overlay, use `RedirectType.replace` — because otherwise the one history entry the overlay pushed remains as the back destination.

**An action that stays on the screen asks for revalidation itself.** The scope of `revalidatePath` is decided by where the change shows up. Anything that also shows in the outer frame (a count in the header, the sidebar) needs `revalidatePath("/", "layout")`; otherwise only the body is fresh and the outer frame stays stale.

**The result stays until the next submission.** It is dismissed when the input is corrected or the viewpoint moves, and shown again on resubmission. The signal to restore the "dismissed" mark is the result's **identity**: `useActionState` returns a new object on every submission, so `!==` against the previous result reveals the change. In the bundled sample, `use-action-result-freshness.ts` holds this, in a shape that knows nothing of the subject matter.

**If you submit inside a confirmation dialog, decide first where the result appears.** The form inside the dialog submits, and the dialog stays open on failure, so the failure is shown inside the dialog (where the user is looking). On success the dialog closes, and whatever was shown there disappears with it. `AlertDialogAction` is a component that closes the dialog the moment it is pressed, so it is not used for the execute button; place `AlertDialogCancel` and a `type="submit"` button side by side.

## Submitting, Double Submission and Confirmation

**While submitting, `Button`'s `pending` makes it unpressable.** Do not leave it pressable on the grounds that an idempotency key keeps a double press from adding twice.

**How the idempotency key is created and carried.** **The Server Component that assembles the screen** calls `newIdempotencyKey()` from [`src/model/idempotency-key.ts`](../../src/model/idempotency-key.ts) once and passes it to the island through props; the island **pins the first value it received** with `useState(initial)` and puts it in a hidden input (`IDEMPOTENCY_KEY_FIELD`). It is pinned because `router.refresh()` swaps only the prop without unmounting the container; without pinning, half-typed input remains while only the key becomes new, and a retry of a submission that never arrived goes out with a different key. The Server Action parses it with `z.uuid()`, and `adapters/server` puts it in the `Idempotency-Key` header. The fetch wrapper ([`adapters/server/http/request.ts`](../../src/adapters/server/http/request.ts)) retries only requests that declare `idempotent: true`.

Not every change needs a key. **An operation that sends a setting (an absolute value) is naturally idempotent**, so it has no key. Conversely, a creation with no natural key is not retried either — sending the same body twice makes two records.

The criterion for **whether to insert a confirmation** belongs to [`docs/rules.md`](../rules.md#forms). When one is inserted, the shape is "a `form` inside an `AlertDialog`": a signal that the confirmation was passed (one hidden field) is put on the submission, and the Server Action also stops on the absence of that signal. Even if the screen checks before the press, the premise can change after the check.

**Submission failures come in two kinds.** Failures where the action **returns** `error`, and failures where the call itself **rejects** (disconnection, exceeding the body limit, 5xx); the latter cannot be received as a return value. Via `<form action>`, a reject reaches the nearest error boundary (`error.tsx`; [ADR 0080](../adr/0080-error-handling.md)). When the action is **called directly without going through a form** (such as a file sent the moment it is chosen), unless the caller receives it with `try / catch`, that submission lingers in a state that is neither in progress nor failed.

**Preventing navigation away** is split between two components: [`app-starter/unload-guard`](../../src/components/app-starter/unload-guard/README.md) (reload, closing the tab, going to an external site) and [`app-starter/navigation-guard`](../../src/components/app-starter/navigation-guard/README.md) (`Link`s beneath it), and **neither can block the browser's back / forward**.

## The File Attachment Endpoint

The receiving endpoint is **a single Server Action** ([ADR 0075](../adr/0075-file-upload-seam.md)).
There is no relay endpoint under `/api/*` that receives the body, and the shape where the browser sends directly to a signed URL is not adopted either.

The Server Action receives the `File`, and the fetch wrapper in `adapters/server` sends it with the `multipart:` option
to the backend's receiving endpoint. What comes back is only the **storage key**; building the display URL is done by `adapters/server`,
combining it with the delivery origin from the startup configuration. **The screen layer cannot read the delivery origin.**

**Delivery is public.** Anything whose audience must be restricted cannot be put on this path.

What to hold on to on the Server Action path:

- **The body limit applies to every Server Action.** `serverActions.bodySizeLimit` in [`next.config.ts`](../../next.config.ts) is `NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES` plus the envelope's share, and no per-action limit can be held
- **Check again at the receiving endpoint.** The Server Action checks for empty, format (the declared `type`) and size. The layer that a signing policy would have carried does not exist on this path, and `type` is a value the sender can set, so it guarantees nothing about the contents
- **Send at the moment of choosing, and put only the key on the main submission.** Each time an image is chosen, the upload action is called directly, and the returned object key is lined up in the form as a hidden input. Large bodies do not mix into the main submission, and one file's failure does not drag the other fields down. This path has **no progress** (there is no way to observe a submission midway)
- The fetch wrapper does not build `Content-Type` for multipart (the runtime adds the boundary string), and **does not retry**

The components split into three, none of which knows the submission path.

| Component | Holds |
| --- | --- |
| [`app-starter/file-upload`](../../src/components/app-starter/file-upload/README.md) | The picker that receives the choice. Rejects before sending with `accept` / `maxSize`, and hands over via `onSelect` / `onReject`. `progress` is provided by the caller, but on the Server Action path there is nothing to provide |
| [`app-starter/upload-preview`](../../src/components/app-starter/upload-preview/README.md) | The list of chosen files and per-item actions. Pass a `File` and it takes on creating and revoking the object URL |
| [`app-starter/attachment`](../../src/components/app-starter/attachment/README.md) | How one item looks. A Server Component |

## Where It Lives in This Repository

The kernel side (remains even after the sample is removed):

| Role | Location |
| --- | --- |
| The return-value contract and helpers | [`src/model/action-state.ts`](../../src/model/action-state.ts) |
| The idempotency key | [`src/model/idempotency-key.ts`](../../src/model/idempotency-key.ts) |
| Display validation schemas | `src/model/<domain>/*-schema.ts` (`zod/mini`) |
| Where contract validation is enforced | [`src/adapters/server/http/request.ts`](../../src/adapters/server/http/request.ts) |
| Contract-derived constants | `src/adapters/gen/api/limits.ts` |
| Normalizing partial updates | [`src/adapters/server/http/patch-payload.ts`](../../src/adapters/server/http/patch-payload.ts) |
| Error classification | [`src/errors/error-kind.ts`](../../src/errors/error-kind.ts) |
| A field's outer frame / attributes | [`src/components/patterns/form-field/`](../../src/components/patterns/form-field/README.md) / [`src/components/design-system/form/field/`](../../src/components/design-system/form/field/README.md) |
| Showing submission results | [`src/components/app-starter/form-feedback/`](../../src/components/app-starter/form-feedback/README.md) / [`form-validation-summary/`](../../src/components/app-starter/form-validation-summary/README.md) / [`src/components/shell/toaster/`](../../src/components/shell/toaster/README.md) |
| Confirmation | [`src/components/design-system/overlay/alert-dialog/`](../../src/components/design-system/overlay/alert-dialog/) |
| Input split into steps | [`src/components/patterns/wizard-form/`](../../src/components/patterns/wizard-form/README.md). Steps not shown also stay in the DOM with `hidden` |
| The Server Action body limit | [`next.config.ts`](../../next.config.ts) `serverActions.bodySizeLimit` |
| Stand-ins in the catalog | [`.storybook/lib/pending-action.ts`](../../.storybook/lib/pending-action.ts) (a never-resolving submit target) and `sb.mock` in `.storybook/preview.tsx` |

On the feature side, every feature has files with the same division of roles. **The Server Action holds only orchestration, and moves parsing and classifying out next to it.**

| Role | File |
| --- | --- |
| Server Action | `features/<name>/actions.ts`. **Anything that needs to assert the principal is `app/**/actions.ts`** (because `features` cannot reach `adapters/server/auth`; [ADR 0025](../adr/0025-app-layer-elements.md)). In that case the screen receives the submit target through props |
| The return-value type | `form-state.ts`. Closes `ActionState<T, TField>` over the screen's field names |
| `FormData` field names | `form-names.ts` / `form-fields.ts`. The sending and reading sides use the same spelling |
| Parsing `FormData` | `parse-*-form.ts`. Re-runs display validation and returns `fieldErrors` or the settled value |
| Mapping the connection target's rejection to fields | `*-rejection.ts` |
| When to show errors | `use-error-visibility.ts` |
| Running validation and building field props | `use-*-fields.ts` (rhf) |
| Freshness of the result | `use-action-result-freshness.ts` |
| The submit button | `ui/submit-button/` (a child of the `form`) |
| Swaps for the catalog | `__mocks__/actions.ts` |

<!-- sample:begin -->
To read the real thing in the bundled sample, the following two are typical examples of different shapes.

| feature | Shape |
| --- | --- |
| [`features/account`](../../src/features/account/README.md) | rhf + `zod/mini` display validation. An update that stays on the screen with a toast, and a registration that moves on with `redirect`. Input split into steps and an idempotency key |
| [`features/admin/products`](../../src/features/admin/products/) | Controlled fields held in `useState` and judgment by functions. Error display with a summary, showing a path depending on `kind`, files sent the moment they are chosen. The Server Action is [`app/admin/products/actions.ts`](../../src/app/admin/products/actions.ts) |
<!-- sample:end -->

## Common Pitfalls

### Reading `useFormStatus` in the component that renders the form always gives `pending: false`

It can read only the state of a parent `form`, and the `form` it renders itself is not its parent. Split the component that shows the submitting state out as a child. For the same reason, on a screen that **sends one submission from two `form`s**, `useFormStatus` splits — the submission state is held by `useActionState`, so distribute `isPending` through Context.

**How to check**: if the button stays pressable while submitting, this is the shape you are in.

### The form is reset when the action finishes — even on failure

React schedules the reset when the action starts and calls `form.reset()` at the transition's commit. It does not look at the returned `status`. Uncontrolled fields return to the value of their `defaultValue` attribute (empty if none).

**rhf's `register` does not prevent this.** What `register` hands out is `name` / `onChange` / `onBlur` / `ref`, not `value` (uncontrolled). The value is only written to `ref.value` at mount time, and the second and later ref calls on the same element return early without rewriting it. So after a reset, rhf's internal state can still hold the typed input while the DOM is empty. A field that must survive a rejected submission takes a shape where React holds `value` (held in `useState`, or with rhf, made a controlled field with `Controller` / `useController`).

**How to check**: prepare an action that returns a failure, and look in a browser at whether the input fields keep their contents after submitting. jsdom tests often look only at the contents of `FormData` and the messages.

### `zodResolver` does not accept `zod/mini` schemas

`zodResolver` requires `zod` types, and a `zod/mini` object does not satisfy them. It stops with a type error, so you notice — but if you rewrite to `zod`'s entry point to get through, the whole of classic `zod` goes into that screen's bundle. The way to connect is `standardSchemaResolver`.

### A field without `defaultValues` is missing from the first submission

rhf treats `undefined` fields as uncontrolled. It arrives in `FormData` not as an empty string but with **the field itself absent**; if the parser reads `formData.get(name)` with `typeof === "string"`, it is evened out to an empty string, but fields read with `getAll` or presence checks behave differently. If there is no value, fill it with an empty string.

### Code written after `redirect()` does not run

`redirect()` throws. Called inside `try / catch`, the catch captures it and returns a failure state, and "failure" appears on screen with no navigation. Call `redirect()` **outside** the try. Every action in the bundled sample wraps the communication in try and places the post-success `revalidatePath` and `redirect()` outside the try.

A `redirect()` pointing at a Route Handler sends no request. The reason belongs to [`rendering.md`](rendering.md#a-server-actions-redirect-does-not-navigate-to-a-route-handler).

### Branching on the message breaks the moment the message is edited

If "whether to add a path to reload" is judged by matching `formError`, the path silently disappears the moment a count or name is inserted into the message. Judge by `kind`. For the same reason, an action with its own message returns `kind` along with it — on a branch that does not go through `actionStateFromError`, unless you attach `kind` yourself, the classification never reaches the screen.

### Creating the idempotency key on every render defeats the key

Calling `newIdempotencyKey()` in a Client Component's render changes the key on every re-render, and both a double submission and a resend become separate requests. Create it in one place, the Server Component that assembles the screen, and pin it in the island with `useState(initial)`. **Passing the prop straight to the hidden input** is the same hole: `router.refresh()` swaps only the prop.

### Do not put the key and submission state in a subtree that unmounts on open / close

Calling `useActionState` inside a dialog / sheet / drawer detaches it with the whole tree when it closes, and it starts from `idle` every time it reopens. Closing it while submitting also removes the place that would receive the result. The screen holds the key and the state in one place only, and the form inside the dialog only receives `formAction`.

### Writing `FormData` field names as strings in two places is not caught by types

Even if the spelling of the sending side's `name` and the reading side's `formData.get()` disagree, types pass, and it first shows up at runtime as "sent, but arrives empty". Put the spellings in one place, `form-names.ts`, and check them against the set of fields with `satisfies Readonly<Record<Field, string>>`.

### Adding `required` makes the browser stop submission on a hidden step

Input split into steps keeps the steps not shown in the DOM too (`hidden`). If a `required` field sits empty on a hidden step, the browser stops the submission **without saying anything**, because of a field it cannot focus. The required **indication** is held by `Field`, and **enforcement** by the Server Action's validation. `FormField` builds `aria-required` but not `required`.

### Files sent the moment they are chosen do not go through the form's `action`

On the path that calls the upload action directly from a hook, neither `useFormStatus` nor `useActionState` is involved. Receive the reject yourself, and hold in-progress, failed and completed in your own state. **Block the submit button while any file has not finished sending** (`blocked`) — otherwise the main submission goes through without the files that have no key yet.

### A narrow `revalidatePath` scope leaves only the outer frame stale

If the result of a change also shows outside the body (a count in the header, the sidebar), revalidating only that route does not re-render the outer frame. Count first where it shows up, and if it shows in the outer frame, invalidate with `"layout"`.

### Reading the result of `useActionState` in an effect lags by one render

Writing the logic that moves the viewpoint or moves focus to the summary based on the submission result in `useEffect` inserts one render before the move, and a screen where "nothing is red, yet the submission does not go through" flashes for a moment. The change of result can be detected during render (`!==` against the previous one), so update state in the body of the render. Put only what **happens outside rendering**, like a toast, in an effect.

### Server Actions do not work as is in the catalog

Pressing a `"use server"` action in Storybook fails when loading `config`. Swap it for the neighboring `__mocks__/actions.ts` with `sb.mock(import("…/actions.ts"))` in `.storybook/preview.tsx` (spell the argument including the extension). To capture the submitting state, use the never-resolving submit target (`neverSettlingAction`). The stand-in for an action that ends in `redirect` returns success and stays where it is, so write in the stand-in's doc that it differs from the real thing.

## Tests

A Server Action is treated in `unit` as "a subject that returns a value", with the `redirect()` throw placed in the normal cases. What to check in tests of components that contain a form belongs to [`docs/testing-conventions.md`](../testing-conventions.md). It is not covered here.

## Related ADRs

- [0060](../adr/0060-state-management.md) — form state = react-hook-form + zod. How much to leave to rhf, and where submission joins in
- [0061](../adr/0061-form-mutation-ux.md) — the authoritative mechanism of `<form action>` + `useActionState` + `useFormStatus`, and the `ActionState<T>` contract
- [0062](../adr/0062-form-input-validation.md) — the two tiers of display validation and contract validation, and when to show errors
- [0063](../adr/0063-mutation-result-notification.md) — when to use inline / toast / redirect, and the live region
- [0075](../adr/0075-file-upload-seam.md) — the receiving endpoint is a single Server Action; delivery is from a public origin
- [0029](../adr/0029-type-design-discipline.md) — discriminated unions, parsing at the boundary, choosing `zod/mini`
- [0025](../adr/0025-app-layer-elements.md) — where Server Actions that need to assert the principal live
- [0072](../adr/0072-api-type-generation.md) — why the generated schema is not shipped to the client, and `limits.ts`
- [0080](../adr/0080-error-handling.md) — classification and catalog messages, error boundaries

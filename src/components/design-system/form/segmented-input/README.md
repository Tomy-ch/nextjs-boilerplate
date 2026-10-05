# SegmentedInput

## Purpose

Takes a fixed-length code in a form split into individual characters.

## Role and Public Components

| Component | Role |
| --- | --- |
| `SegmentedInput` | The single `input` that is the actual element. `maxLength` sets the number of characters, and it takes on focus movement between characters, pasting and rolling back deletions. |
| `SegmentedInputGroup` | A section that makes adjacent characters look like one group. Only its two ends are rounded. |
| `SegmentedInputSlot` | The frame for one character. Renders the character at `index` and whether it is the input position. |
| `SegmentedInputSeparator` | A decorative separator placed between sections. |

`SEGMENTED_INPUT_PATTERN` is the set of accepted character kinds: `DIGITS` (digits only) / `CHARS` (letters only) / `DIGITS_AND_CHARS` (alphanumeric).

## Use Cases

**It is not specific to one-time passwords.** Use it for any input of fixed length where the split into characters is meaningful.

- Entering a confirmation code sent by SMS or email
- Entering a PIN or a two-factor authentication code
- Entering separated alphanumerics such as an invitation code or a license key
- When the number of characters is fixed and the user should see how far they have entered

## Responsibility Boundaries

In the SSR-first selection it is `○`. It is a client island that needs hydration for focus movement between characters and tracking the input position, and cannot be rendered directly from a Server Component.

**Do not use it when the per-character display is not needed.** Giving `Input` an `inputMode` and a suitable `autoComplete` is enough, and needs no client runtime either. This component is needed when you **want to show how far the user has entered in the shape of the characters**.

**It does no OTP validation whatsoever.** What this component takes on is only the input surface split into characters. Issuing, verifying, expiry, resending and limiting attempts of the code — the processing that makes something a "one-time password" — are all absent here. It is the same as `Input` holding no authentication responsibility even when a password is typed into it.

This mix-up does happen. Reading it as an "authentication component" from its name makes it look like a component touching ADR [0079](../../../../../docs/adr/0079-auth-frontend-seam.md), which puts the authentication core out of scope, leading to the conclusion that it must not be placed here. In fact it is a plain input field also used for confirmation codes unrelated to authentication (confirming an email address or phone number, step-up confirmation for sensitive operations).

**It holds no value validation, submission or resending.** The caller handles them with `value` and `onChange`. It holds no error text either; the caller shows it as `FieldError`. The caller also decides `aria-invalid`.

**Choose `autoComplete` to match the use.** Specify `one-time-code` only when receiving a code sent by SMS or email, so the OS and browser can autofill it. Applying `one-time-code` to a code that is not delivered, such as a PIN or license key, gets unrelated SMS codes suggested.

The accepted character kinds are decided by passing one of `SEGMENTED_INPUT_PATTERN` to `pattern`. Pasted strings are rejected by the same rule. Without it, character kinds are not restricted. Features use this value set rather than importing the vendor's regular expression constants directly.

**This component does not decide the use.** Differences between uses are given by the following four. They are independent axes, so there is no combined "use" value.

| Axis | What it gives |
| --- | --- |
| `pattern` | The accepted character kinds (`SEGMENTED_INPUT_PATTERN`) |
| `autoComplete` | The autofill hint. `one-time-code` only for a delivered code |
| `inputMode` | The keyboard to bring up |
| `mask` | Whether to hide the typed characters |

**`mask` hides only the appearance.** The actual element stays a `text` `input`, so assistive technology reads the value out as is and password managers treat it as a string. It prevents shoulder surfing, but the input is not treated as one that handles a secret. The mask character can be replaced with `maskChar`, and overridden per character with `mask` on `SegmentedInputSlot`.

The characters are visual. There is only one actual `input`, and `SegmentedInputSlot` receives neither input nor focus. If `maxLength` and the number of `SegmentedInputSlot` disagree, there are characters that can be typed but are not rendered. A `SegmentedInputSlot` placed outside `SegmentedInput` becomes an empty frame that shows nothing.

`SegmentedInputSeparator` is hidden from assistive technology. The input value is conveyed by the actual `input`, so this symbol has no meaning. The `separator` role is not applied because it denotes a widget with focus and a value.

The implementation is `input-otp`.

## Storybook and Tests

Storybook lists how uses are assembled (confirmation code / PIN / license key), with all four axes made explicit. That the axes are independent is shown with a combination that masks alphanumerics. It also checks replacing the mask character, per-character overrides, no separators, the filled state, a validation error, and the non-operable state.

The tests check that it is exposed as a single named input carrying an autofill hint, that `pattern` restricts character kinds, that it renders one frame per character, that the typed value is reflected per character, that input is passed through `onChange`, that the character at the input position is indicated with `data-active`, that a frame placed outside `SegmentedInput` shows nothing, that separators are hidden from assistive technology, that separators may be omitted, that `mask` hides characters, replacing the mask character, per-character overrides, and the automated a11y check.

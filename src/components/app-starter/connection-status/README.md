# ConnectionStatus

## Purpose

Shows with a short label how continuous receiving is going right now. It is the surface a screen with a subscription uses to tell the user "whether new items are being received".

## Role and Public Components

| Component | Role |
| --- | --- |
| `ConnectionStatus` | Shows the copy corresponding to the current receiving state on a `Badge` surface. |

`CONNECTION_STATUS` and `ConnectionStatusValue` are exported from `connection-status.definition.ts`. This definition owns the values that can be given to `status`, and callers do not write strings such as `"receiving"` directly.

| status | What it indicates |
| --- | --- |
| `connecting` | Trying to connect. Nothing received yet |
| `receiving` | Receiving |
| `reconnecting` | Disconnected and reconnecting |
| `offline` | No network |
| `suspended` | Nothing to receive yet |
| `halted` | Given up. Reconnecting would give the same result |
| `expired` | Credentials expired. Re-entering resumes it |

## Use Cases

- Constantly showing whether a screen updated by a subscription is receiving
- While the network is down, conveying that fact ahead of the subscription's state
- Wording "given up" and a temporary disconnect differently, as a difference in what the user should do

Use `Spinner` for a local indicator of work in progress, and `FeedbackState` for the state of a region or the whole screen. Use `Alert` for notices that must not be missed.

## Responsibility Boundaries

In the SSR-first selection it falls under `◎`. It is a display-only Server Component that needs no hydration and has no client island.

**It owns no communication.** It owns neither connecting, reconnecting nor deciding the state; it only shows the copy for the state it is given. The caller decides which state to pass and when. **It does not know the means of communication either** — whether a subscription or periodic fetching, whether receiving is continuing can be expressed with the same words.

The semantics of `status` reach assistive technology as `role="status"`. `aria-live` is `polite`, so that only changes are conveyed without interrupting.

**It is a component meant to stay displayed.** It can also be shown only while disconnected, but in that case the screen must separately show whether "not shown" means "connected" or "not receiving in the first place".

Color is only layered on the copy, and **it never distinguishes by color alone**. Several states share the same priority color, so the copy does the distinguishing.

It has no vendor dependency. The surface composes `Badge`.

## Storybook and Tests

Storybook checks how each of the 7 states looks. The combination of surface color and copy can be judged only by actual rendering, so it is within Storybook's scope.

Tests check the copy for each state, the semantics of `role="status"` and `aria-live="polite"`, that the state is exposed as a data attribute, that every state has copy, that nothing is distinguished by color alone, that attributes from the caller are passed through as is, and automated a11y checks.

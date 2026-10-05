# `/dev/session` Development Session (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

## What It Shows

| Region | Content |
| --- | --- |
| Current session | User ID, role, expiry time, and the action to discard it |
| Issue a session | Who to enter as, role, seconds until expiry, and the API connection mode toggle |

**The API connection mode swaps the fields shown below it.** When on, the IdP connection target appears; when off, Access Token
(optional) appears. Showing both at once leaves no way to tell from the appearance which one takes effect.

**The current state comes first.** What the person opening it wants to know first is "who am I signed in as right now", and only once
that is known do they decide whether to sign in again.

**Even when opened as the authorization start point, the appearance does not change.** The correlating value is only put in the
submission, and there is no reason to show it on screen. What changes is the submission target and the granularity of the reason shown
on failure — on that path no per-field reasons appear, only one sentence per classification below the submit button.

## What It Does Not Show

**The Access Token is not shown on screen.** Not being observable from the browser is the very reason the session has this shape, and
showing it to check would break that property oneself. There is a field to paste it in, but no field that reads the pasted value back.

## Layout Shell

It is not placed inside the customer-facing outer frame (the header nav and its surroundings). It is separate from the customer's
navigation, and not something to list in the nav either.

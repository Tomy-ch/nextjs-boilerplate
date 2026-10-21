# `/login` Login (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A screen holding only the action that starts authentication. It sits in the authentication layout shell ([`layout.screen.md`](../layout.screen.md)).

## What It Shows

A single panel is placed in the center of the screen, its width kept narrower than the reading width. It holds only four things:
the heading, the description, the notice (if any), and the action; nothing else is listed.

**It has no credential input fields and sends the user out to the authentication provider's screen.** Why that path is taken, and
what it will look like once input fields arrive, are held by [`page.function.md`](page.function.md).

## Description

**Write three things that only mean something before pressing.**

1. That authentication is required to continue the operation
2. That authentication happens at an authentication provider outside this app, and returns to the original operation once done
3. That no account is created on this screen, and first-time users are also guided to complete authentication first

That the destination is a screen that looks different, and that no account is created here, are too late to say after pressing.

**Write neither the name of a specific authentication provider nor per-environment guidance (trial credentials and the like).** Write
only what is true whichever authentication provider is connected.

## Notice

The notice shown when authentication could not start is placed **before the action that starts authentication**. The user was sent
back as the result of pressing, so unless it is where it is read before pressing, the reason is not seen until the same action is
pressed again.

It looks like a warning panel of the negative tier, and assistive technology announces it immediately. **When there is no notice, the
area itself is not placed.** An empty frame that is always present makes the fact that nothing happened look like a warning.

## Interaction

**There is only one action**, spanning the full width of the panel. There is nothing to choose, so no reason to make the user look for
what to press.

## Related

- The next screen in the same layout shell: [`/onboarding`](../onboarding/page.screen.md) <!-- sample:line -->

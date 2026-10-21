# `auth` Outer Frame (Screen Requirements)

> It has no functional requirements. What this outer frame promises is only how things look.

The layout shell wrapping the screens involved in the authentication round trip.

- [`/login`](login/page.screen.md)
- [`/onboarding`](onboarding/page.screen.md) <!-- sample:line -->

## What It Shows

A layout shell separate from the one wrapping the other screens, **showing neither navigation nor a sidebar**. Listing other links
while prompting for authentication leaves users who leave through them unable to return to the original operation
([0026](../../../adr/0026-layout-shell-mount.md)).

**Even so, the layout shell itself is kept.** This keeps a path back to the top (`/`) from the site name in the header; removing the
whole frame would leave users who want to abandon authentication no means other than "back".

## Breadcrumbs

None. A user who arrives at a screen in this layout shell has not yet been able to enter any screen, and has no ancestor to return to.

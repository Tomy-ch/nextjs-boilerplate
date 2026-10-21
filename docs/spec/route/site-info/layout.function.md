# `(site-info)` Outer Frame (Functional Requirements)

> Screen requirements are in [`layout.screen.md`](layout.screen.md).
>
> What is written here is **the promises that apply to every screen beneath it**. Each screen's own are held by its `page.*.md`.

Beneath it are three pages: [`/about`](about/page.function.md) / [`/privacy`](privacy/page.function.md) /
[`/terms`](terms/page.function.md).

## Fetches nothing

**This layout shell touches neither the backend nor cookies.** That is the reason this layout shell exists.

If the layout shell has even one dynamic hole that touches a request-time API, then even though the static shell is delivered first, the server runs on every
request to fill that hole ([0041](../../../adr/0041-cache-components-decision.md)).
**The only way to deliver the three pages beneath it as their build-time form alone is for the layout shell to step back until it reads nothing**.

So the split from `(shop)` is **because the time of rendering differs**, not because the intended appearance differs
([`../shop/layout.function.md`](../shop/layout.function.md), 「カートの供給」).

## Destinations

The global nav points to three places — products, purchase history and My Page — and shows the same items as `(shop)`. To users
it is the same path through the same site; if each layout shell had its own list, where you could go would change depending on the screen you came through.

**Do not show the cart entry point.** The item count is read state, and showing it requires reading at request time. Only the entry point
disappears; `/cart` itself is not closed. There is no path from this layout shell straight to `/cart`; moving to a
shopping screen through the nav lets you in through the entry point in that header.

**Do not show the admin entry point either.** Deciding whether to show it reads the session. A layout shell that does not read cannot decide, and
not showing it is the safe side ([0079](../../../adr/0079-auth-frontend-seam.md)).

## Boundary with Shopping

**Client state is not carried over to or from `(shop)`.** The layout shells are separate, so a navigation across the boundary replaces the whole
layout shell. Coming to read the site information in the middle of shopping loses state that means something only inside shopping — the memory of a cancellation
([`../shop/layout.function.md`](../shop/layout.function.md)).

**This is an accepted consequence.** Reading the site information is not a continuation of shopping but an action that leaves it
([0026](../../../adr/0026-layout-shell-mount.md)). If something ever needs to survive the crossing, group this layout shell and
`(shop)` under a parent route group.

## Authentication

**Not protected.** Everything beneath it is content that means nothing unless it can be read before logging in.

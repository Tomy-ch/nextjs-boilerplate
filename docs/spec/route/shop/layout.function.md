# `(shop)` Outer Frame (Functional Requirements)

> Screen requirements are in [`layout.screen.md`](layout.screen.md).
>
> What is written here are **promises that apply to every screen beneath it**. Each screen's own requirements live in its `page.*.md`.

## Supplying the Cart

The outer frame fetches the cart and passes it to the header's entry point and the sidebar.

**It is not fetched per screen.** Wherever a product is added to the cart from, the result must appear in the same place, and
placing it on the screen side would multiply fetches and containers by the number of screens that can add to it ([0026](../../../adr/0026-layout-shell-mount.md)).

The fetch endpoint is the same as `/cart`, so within the same render there is a single round trip. Therefore **the outer frame and the body never show the cart
at different points in time**.

**This fetch reads a cookie, so it is placed outside the layout shell's static shell.** The header's entry point and the sidebar each arrive later as
dynamic holes cut out of the static shell. The layout shell's static shell (header, nav, footer) and the body's static shell are served first without knowing the actor,
and the cart fills in afterwards ([0041](../../../adr/0041-cache-components-decision.md)). If the layout shell
held the fetch, every screen beneath it would wait for that round trip before starting to render.

**The three informational pages, which have no fetching, are placed outside this layout shell.** Passing through this layout shell, the static shell would be served first, but
the server would run on every request to fill the dynamic holes. Serving the three as their build-time form alone requires dropping down to a layout shell
that reads neither the cart nor the session, which
[`../site-info/layout.function.md`](../site-info/layout.function.md) takes on.

**If it cannot be read, continue without showing the cart.** Throwing here would bring the screen down to one with neither header nor nav,
because there is no `error` boundary wrapping a layout at the same level (a child `error.tsx` does not catch its parent layout's failure)
([0080](../../../adr/0080-error-handling.md)). When the cart cannot be read, the cart screen itself
cannot open either, so dropping the entry point from the outer frame does not reduce the places that can be reached.

**It is not shown as an empty cart.** "Empty" and "could not be read" are different states, and mixing them makes the cart look as if
it emptied on its own.

## Remembering Undo

The memory for returning a removed line item is placed **outside the cart's container**. Removing the last item changes both the sidebar and
the cart screen to their empty form, so holding it inside the container would lose the memory along with that switch.

What is remembered and how it is returned is owned by [`cart/page.function.md`](cart/page.function.md).

**It is lost when leaving this layout shell.** Moving to the three informational pages ([`../site-info/`](../site-info/layout.function.md))
swaps out the whole layout shell, and the memory does not remain. It is a convenience that only means something inside shopping, so it is treated as
something that may be lost once the user leaves shopping ([0026](../../../adr/0026-layout-shell-mount.md)). If it ever needs to survive the crossing,
the two are grouped under a parent route group.

## Authentication

**The outer frame is not protected.** Viewing products, adding to the cart and checking the cart require no authentication. A screen that
needs protection performs the definitive authorization itself ([0079](../../../adr/0079-auth-frontend-seam.md)).

## Destinations

The global nav points to three places: products, purchase history and my page. The cart is pointed to not by the nav but by the header's entry point
(because the entry point also opens and closes the contents).

**For an actor with the admin role, an entry point to the admin screens is added as a fourth.** Whether to show it uses the same predicate as
the admin side's definitive authorization. If the decisions were written separately, a state of "the entry point shows but you cannot get in" could be
created ([`../admin/layout.function.md`](../admin/layout.function.md)).

**This decision reads the session.** The outer frame requires no authentication, but it reads identity to decide whether to show the entry point.
If it cannot be read, the outer frame is not brought down; the entry point simply is not shown.

# `/maintenance` Under Maintenance (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen shown in place of every route while delivery is stopped.

## What It Shows

| Section | Content |
| --- | --- |
| Heading | That the service is stopped |
| Body | That it cannot be used right now |
| Body | That no scheduled end is announced, and to try again after a while |

## What Not to Write

**No link back.** Every route is stopped, so wherever it sends the user the same screen comes back. Showing something
pressable means the user learns that pressing it changes nothing only after trying.

**No recovery estimate.** Showing a schedule requires operations to supply one, and writing it into the text without that
supply leaves a schedule on the screen that will not hold.

**No reason for the stop.** Even if the user can tell a planned stop from an outage, what they can do does not change.

## Layout Shell

**It does not pass through a route group's layout shell.** What is rendered is the swap target's `maintenance/` hierarchy, which sits
outside the route groups. This screen places `main` itself.

The header and nav are not shown because, if shown, every link in them would lead back to this screen.

**It does pass through the root outer frame** ([`../layout.screen.md`](../layout.screen.md)). A user who has not yet chosen a consent option
sees the consent surface over this screen too, and cannot leave it until choosing. While stopped, the links the surface offers to the
material for that decision lead back to this screen. The notification region is also placed, but this screen has no operation that
raises a notification, so it stays empty.

## Related

- Implementation `src/features/maintenance/` — [README](../../../../src/features/maintenance/README.md)
- Swap decision `src/proxy.ts` — [0043](../../../adr/0043-middleware-policy.md)

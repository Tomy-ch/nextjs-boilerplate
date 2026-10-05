# `/terms` Terms of Use (Functional Requirements)

> Screen requirements are in [`page.screen.md`](page.screen.md).

## Rendering

**Fixed at build time.** It has no fetching, and its content changes only when the code is rewritten
([0041](../../../../adr/0041-cache-components-decision.md)). The layout shell reads nothing either
([`../layout.function.md`](../layout.function.md)).

## Authorization

**Not a protected target.** Since viewing counts as consent, it does not hold unless it can be read before
logging in.

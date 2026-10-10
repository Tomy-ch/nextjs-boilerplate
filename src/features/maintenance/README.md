---
imports-allowed: [model, components, adapters, capabilities, stores, errors, logging, observability] # Generated: regenerate with `pnpm gen:architecture`
forbidden: [features]
test-requirement: [feature, component, unit]
---

# maintenance

The slice that owns the surface shown in place of every route while serving is stopped.

## What Belongs Here

- The text saying that service is stopped and what cannot be done right now

## What Does Not Belong Here

- **Deciding whether to stop.** The entry point (`src/proxy.ts`) reads `config/maintenance` and decides. If this slice
  held that decision, every route would become dynamic while stopped
- **Refusing requests that change state.** The replacement only changes what is rendered, so refusing is the entry point's job
  ([spec](../../../docs/spec/route/maintenance/page.function.md))
- **The expected recovery time.** Showing a schedule requires the operations team to supply it, and writing one into the text without that supply
  leaves an inaccurate schedule on the screen

## Routes and Contracts

| Route | Spec | Authentication |
| --- | --- | --- |
| `/maintenance` | [`screen`](../../../docs/spec/route/maintenance/page.screen.md) / [`function`](../../../docs/spec/route/maintenance/page.function.md) | Not required |

**No operationId is used.** This is because the slice does no fetching, and it does not change as the contract grows. Calling the backend while
stopped gets no response when the reason for stopping lies on the backend side.

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Stopped | default | No whole-screen story is placed (see below) |

**With neither fetching nor operations there is only one state, so no screen story is placed.** One would be
a single `Default`, and each added story only lengthens the VRT run time. The look is covered by the E2E screen comparison
(`e2e/lib/screens.ts` has `maintenance`) — **`/maintenance` can be opened by URL even when service is not
stopped.** This is because the replacement decision belongs to the entry point, and this screen itself reads nothing.

## Structure

| File | Role |
| --- | --- |
| `view.tsx` | The text saying that service is stopped |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `observability` | Puts rendering on spans |

It does no fetching, so it does not use `adapters`. Nor does it use `components` — the container (`main` and
`ContentContainer`) is placed by the route side, and this surface holds only the text.

## Action Return Contract

None. This screen has no operations.

## Test Perspectives

- [ ] Nothing pressable is placed (while stopped, every destination of a press comes back to this screen)
- [ ] No inaccurate end time is shown

## Where to Change It

The text is shown as is. **If you add a link to contact details or a status page, first confirm that the destination is reachable
while service is stopped.** A link pointing at your own serving surface is replaced by the entry point with this same screen.

## Related ADRs

- [0043](../../../docs/adr/0043-middleware-policy.md) — The role of the entry point (`src/proxy.ts`). The decision to stop and the replacement belong there
- [0054](../../../docs/adr/0054-ui-catalog-storybook.md) — The catalog policy. The decision not to place a whole-screen story is an exception to it
- [0090](../../../docs/adr/0090-testing-strategy.md) — Test responsibilities per layer. The line that moves visual checks to the E2E screen comparison

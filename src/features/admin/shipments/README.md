---
test-requirement: [feature, component, unit]
---

# admin/shipments

The screen slice that handles paid but not yet shipped orders per shipment group — the units that may be
shipped together (`/admin/shipments`).

**This README does not declare the import ceiling.** Boundaries are declared at an element's root, and the root of the element containing this directory is [`admin/`](../README.md) ([0021](../../../../docs/adr/0021-frontend-responsibility.md)).

## What Belongs Here

- Orchestrating the fetch of orders awaiting shipment, and the per-group display
- Assembling shipment submissions (one at a time / a whole group at once) and showing their results

## What Does Not Belong Here

- How groups are divided and ordered (the contract decides)
- Checking the role (held by the app layer, which is the receiving endpoint of the submission)
- One purchase's detail (held by the screen for the purchaser; the management side has no surface for viewing one)

## Routes and Contracts

| Route | Specification | Authentication |
| --- | --- | --- |
| `/admin/shipments` | [`screen`](../../../../docs/spec/route/admin/shipments/page.screen.md) / [`function`](../../../../docs/spec/route/admin/shipments/page.function.md) | Role: admin |

The parent's ([`admin`](../README.md)) Authorization section applies to this screen as is.

operationIds used.

| operationId | Purpose | Caller |
| --- | --- | --- |
| `GetPurchasesShippable` | Groups awaiting shipment | feature |
| `GetPurchases` | Shipped orders awaiting delivery confirmation | feature |
| `PatchPurchasesShip` | Shipping. Called once per purchase even when a group is shipped together | An app-layer Action |
| `PatchPurchasesDeliver` | Confirming delivery | An app-layer Action |

## States and Design References

| Screen | State | story |
| --- | --- | --- |
| Shipments | success | `Page/Admin/Shipments/Default` |
| | empty (both sections empty) | `Page/Admin/Shipments/Empty` |
| | Nothing awaiting shipment | `Page/Admin/Shipments/ShippedOnly` |
| | loading | `Features/Admin/Shipments/Skeleton/Default` |
| One group | Not shipped / shipped / partially succeeded / refused | `Features/Admin/Shipments/DispatchGroupCard/{Default,Shipped,PartiallyShipped,Refused}` |

**A partially succeeded submission has a dedicated story.** The crux of a screen that ships in bulk is
"not folding into a single success or failure", so that form must exist as a real artifact. error is taken by
the parent's `Features/Admin/ErrorState` (States and Design References in [`admin`](../README.md)).

## Structure

| File | Role |
| --- | --- |
| `form-names.ts` | The field names the submission carries. Orders to ship are listed repeatedly |
| `form-state.ts` | The container for submission results (for shipping, the counts that went through and did not; for delivery, the confirmed order) and the wording when refused |
| `shipments.fixture.ts` | Fixed groups and orders awaiting delivery used by stories and tests |
| `page-content.tsx` | Assembling the loading boundary |
| `results.tsx` | Fetching what awaits shipment and what has shipped. Holds no appearance |
| `view.tsx` | Stacks the groups vertically and lists the shipped orders below |
| `ui/dispatch-group/` | One group. Destination, list of orders, shipping operation, result |
| `ui/delivery-list/` | The list of shipped orders. The operation to confirm delivery, and its result |
| `ui/empty/` | The display when both sections are empty |
| `ui/skeleton/` | The groups' loading UI |

## Kernel Dependencies

| Kernel | Purpose |
| --- | --- |
| `adapters` | Fetching what awaits shipment and what has shipped |
| `model` | Display models (groups, purchases, statuses) and `ActionState` |
| `components` | The containers screens are built from (cards, tables, submit controls) |
| `observability` | Putting rendering on spans |

## Action Return Contract

**The Server Actions live in the app layer** (the reason is under the parent's Action Return Contract).

| Action | Location | Return value | After success | On failure |
| --- | --- | --- | --- | --- |
| `shipPurchasesAction` | `src/app/admin/shipments/actions.ts` | `ShipmentState` | If even one goes through, refetches the list and returns the count that went through and the count skipped due to conflicts | If none goes through, returns it as a conflict. Anything other than a conflict stops on the spot and returns only the classification |
| `deliverPurchaseAction` | Same as above | `DeliveryState` | Refetches the list and returns the confirmed order | Tells conflicts apart from everything else and shows it next to that operation |

**Counts are included only on success.** A stopped submission returns a classification; what went through up
to that point appears not in the return value but in the refetched list.

## Test Perspectives

- [ ] The bulk operation sends the orders lined up in the same submission
- [ ] Even when a submission stops midway, the shipments that went through up to then are reflected in the list
- [ ] If even one goes through, the list is refetched
- [ ] Delivery confirmations cannot be bulked
- [ ] The screen does not reorder groups or the order within a group

## Design

- **Delivery confirmations are not bulked.** Whether something arrived differs per order, so a shape that
  confirms in bulk creates a path to marking unchecked items as confirmed
- **No reordering.** How groups are divided, the order within a group and the order between groups are all
  decided by the contract. If the screen reordered them, the screen's judgment would overlay the contract's
  judgment of "the unit that may be shipped together"
- **The bulk operation just lines the orders up in the same submission.** The contract ships one purchase at a
  time and has no endpoint for bulk instructions. Expressing the bulk unit as a different submission shape
  would give the receiving side two forms to handle
- **A partially succeeded submission is not made a failure.** Bulking a group can be refused midway. Folding it
  into a single success or failure hides what went through, so both the count that went through and the count
  that did not are reported
- **If even one goes through, the list is refetched.** A shipped order no longer awaits shipment, so leaving it
  would keep an operation listed that always conflicts when pressed. The same holds when stopped midway:
  reporting why it stopped and reflecting the shipments that succeeded up to then are separate matters
- **No confirmation step.** Shipping is assembly-line work, and a confirmation for each one builds a habit of
  pressing without reading it. The targets are on screen before pressing
- **Purchasers are shown by identifier.** The contract carries no display name. The purpose is to tell groups
  apart, so the identifier suffices

## Related ADRs

- [0021](../../../../docs/adr/0021-frontend-responsibility.md) — Layer responsibilities and import boundaries. What is lent to other features goes out through `facade/`
- [0025](../../../../docs/adr/0025-app-layer-elements.md) — The elements of the app layer. The submission's receiving endpoint holds the role check
- [0040](../../../../docs/adr/0040-routing-rendering-strategy.md) — Rendering strategy. The boundary between fetching and client islands
- [0061](../../../../docs/adr/0061-form-mutation-ux.md) — The canonical `<form action>` + Server Action mechanism
- [0070](../../../../docs/adr/0070-backend-role-separation.md) — The responsibility line with the backend. The contract decides how groups are divided and ordered
- [0073](../../../../docs/adr/0073-pagination-fetch-boundary.md) — The pagination / incremental fetch boundary. When a list gets pagination

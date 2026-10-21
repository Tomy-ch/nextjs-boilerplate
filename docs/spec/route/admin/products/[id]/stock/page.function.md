# `/admin/products/[id]/stock` Restocking (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../../../layout.function.md`](../../../layout.function.md).

Moves the stock of one product, and nothing else.

## Only the stock moves

**No other field is sent.** Product name, price, category and the like belong to the edit screen. They are separated because the
update method differs: stock is added as a relative value, while the other fields write back what was read. Mixing them in one
submission drags one side into the other's conventions.

## What is sent is the delta, not the stock count after the update

**The contract accepts a signed delta.** Whatever sold, or whatever another actor restocked, between reading and sending is not
cancelled out but combined.

**Therefore the user is not asked for "the stock count after the change".** If the screen computed the difference and sent it,
the difference would rest on the stock that was read, and the benefit of a relative update would be lost on the spot.

**No version is attached.** Relative updates are not lost when concurrent, so there is no need to detect and reject conflicts in
the first place.

## Taking direction and quantity separately

**The person entering chooses "increase or decrease" and "how many"; the screen adds the sign.** Accepting a signed number in one
field turns a forgotten minus into an update in the opposite direction, and the only way to undo it is "send it again in the
opposite direction".

**Quantity accepts only integers of 1 or more.** Letting 0 through treats a request that moves nothing as a success, and the
person who pressed takes it that something moved. Negatives have no route in, since the direction expresses them.

**A value whose direction cannot be read is rejected, not defaulted.** There is no case for moving stock without knowing which way.

## A request for more than the stock is not stopped on screen

**A request that subtracts more than the current stock is still sent.** The only basis for stopping it is the stock as of loading;
whether there is enough at the time of sending is known only to the contract side. **The contract rejects out-of-range requests.**

## On success, go to the list

**Do not stay on the same screen.** An addition takes effect twice if resent, and since it has already succeeded there is no way
to undo it. Restocking repeatedly goes by way of the list.

On success, the fetch that reads the product is made to refetch.

## Failures

| What happened | Handling |
| --- | --- |
| Rejected because it was moved concurrently | Treated as resendable after a refetch; a link to reload is attached |
| The stock after the change falls outside the range it can hold | Treated as an input error |
| Temporarily not accepted | Treated as something to retry after a while. No retry link is attached |
| Insufficient role | Does not appear on this screen, because the layout shell stops it at the entry point |

## Related

- [`../edit/page.function.md`](../edit/page.function.md) — the screen that handles everything other than stock
- [`../../page.function.md`](../../page.function.md) — the list that leads to this screen

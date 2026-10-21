# `/admin/users` User List (Functional Requirements)

> Screen requirements: [`page.screen.md`](page.screen.md).
>
> The promises on authorization and the layout shell are held by [`../layout.function.md`](../layout.function.md).

Surveys the registered users and closes their accounts.

## Pagination counts by position

**The contract returns a position (starting from which item) and the total count, so any page can be jumped to.** The cursor
approach the product and purchase lists use points only to "the next position", and expresses neither how many items there are in
total nor a means of jumping to an arbitrary position. **Though both are "lists", only this screen counts differently.**

**The number of pages is derived from the total count.** The contract does not return a page count.

**The screen decides the number of items per page.** The limit the contract accepts is a line meaning "anything above this is
rejected", and moves for reasons unrelated to how many items can be listed readably.

## Three scopes

**Three: 「すべて」 (all), 「有効」 (active), 「退会済み」 (closed).** The contract expresses them as three values: a boolean or unspecified.

**When the scope is chosen again, the page position is discarded.** Page 3 of the previous scope points to different people in the new scope.

**Users can edit the URL directly.** An unreadable scope or an unreadable page number falls back to the default. The result of the
fallback is visible as the current value in the scope selection and the pagination, so it is the kind that may fall back. Sending a
value the contract rejects as is yields only a rejection, leaving the person who pressed nothing to do. **The upper limit is treated
the same way** — the contract caps page numbers, and sending a value beyond it without falling back shows an error page instead of
the list.

**Default values are not put in the URL.** It would give the same list two addresses.

## Account closure is irreversible

**A confirmation is inserted.** A mistaken press cannot be undone.

**The cleanup does not finish at the same time.** Even after the closure succeeds, cancelling that person's in-progress purchases and
returning their stock proceed later, in order. **The screen does not treat these as finished** — showing only 「退会しました」 (account
closed) makes someone looking at the list read that the stock has already been returned too.

**The list is not made to refetch.** The cleanup continues under eventual consistency, so refetching right afterward would only show
"a list not yet reflecting it". The latest list is seen when the user reloads.

**Users whose accounts are already closed are not offered the closure action.** There is no point closing them again, and the contract
would reject it if offered.

## A separate endpoint from closing one's own account

**Closure on this screen targets someone else.** Closing one's own account tears down the operating side's session; this one must
not tear it down.

## Failures

| What happened | Handling |
| --- | --- |
| Rejected because in-progress purchases remain | Treated as not closable until the purchases finish or are cancelled. **Does not assume asynchronous cancellation or stock restoration** |
| No target was sent | Treated as something to fix by reopening the screen |
| Insufficient role | Does not appear on this screen, because the layout shell stops it at the entry point |

## Related

- [`../layout.function.md`](../layout.function.md) — authorization and the layout shell

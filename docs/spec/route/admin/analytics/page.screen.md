# `/admin/analytics` Aggregates by Period (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).
>
> The layout shell's promises are held by [`../layout.screen.md`](../layout.screen.md).

A screen for choosing a period, reading the aggregates, and checking the best-selling products.

## What It Shows

| Region | Content |
| --- | --- |
| Heading | The screen's name and what can be done here |
| Period selection | Today / This month / Custom range |
| Target calendar dates | Directly below the selection. Which dates the numbers currently shown are about |
| Aggregates | Metric cards and counts by status. The same components as the entry screen (`/admin`) |
| Best sellers | Products from the last 30 days. **Does not follow the period selection** |

## Only what is below the options is refetched

**When the period is chosen again, only the aggregates wait.** The options and the target calendar dates stay shown. Wrapping
everything in one loading state makes the very option that was pressed disappear and come back, and the user loses track of what
they pressed.

**Best sellers do not wait either.** The region does not follow the period selection, so changing the period gives it no reason to refetch.

## Period Selection

**Today and This month are links.** The chosen period is in the URL, so the selection is not "this screen's state" but "which
screen is being viewed". Making it a tab or a toggle loses the way back to the same state from both history and shared URLs.

**Only Custom range opens an overlay.** The destination is not fixed until both ends are, so it cannot be a link that navigates
the moment it is pressed. Keeping date inputs permanently in the row would always show that area even to users who do not use dates.

**The item currently viewed is marked with `aria-current`.** Indicating the current location by color difference alone does not
reach users who cannot distinguish colors.

**Dates are not carried over.** When switching to Today / This month, the dates are not put in the URL either. Leaving them there
keeps a condition that has no effect only outside the screen (the address bar, a shared URL).

## Showing the Target Calendar Dates

**The option's name alone does not tell which dates are being viewed.** Which month "This month" is, and when "Today" is, depend
on when the screen was viewed. Someone reading a shared screen or a captured image later finds no such clue left on the name's side.

When it points at a single day, do not use the range form. Listing the same date twice gives the reader nothing.

**State that the boundaries are calendar dates in Japan time.** The backend decides this, and it is not in the response
([`page.function.md`](page.function.md)).

## The Custom Range Overlay

**Its content is a native GET form.** Submitting turns the entered values into the URL's query as is, and that URL becomes the
aggregation condition.

**The previously chosen dates come back as initial values.** Reopening does not make the user re-enter them. What remembers them
is the address bar, not the overlay.

**Date order is also shown by the input constraints.** However, the constraints look at the values that were in the URL, not at
the values being edited right now. A swapped pair can still be submitted, so it comes back as an error from where it was sent.

## The best sellers' heading says their period is different

Best sellers are fixed to the last 30 days and do not follow this screen's options ([functional requirements](page.function.md)).
Placing them in the same frame and silently showing a different period gets them read as the best sellers for the chosen period.

**The product name leads to the product's page.** When someone finds what is selling, the next thing they want to know is what
that product is. The destination is the customer-facing page because the admin side does not yet have a page for viewing a single product.

**The whole row is not made clickable.** Only the product name is the link; rank, units sold and price do not describe the destination.

## What Changes with Width

| Width | Period selection | Aggregates | Best sellers |
| --- | --- | --- | --- |
| A side list fits | 1 row | Metric cards in 4 columns / bars and table side by side | All columns |
| It does not fit | Wraps | 2 columns / bars then table, stacked | **Price hidden** |

On the narrow band, best sellers keep two things: **which sold, and how much**. Price is not a clue for reading best sellers.
The band boundaries are held by [0051](../../../../adr/0051-styling-system.md).

## When the period is not settled

**Dates that are not both filled are not shown as a failure.** The user is about to choose them; showing an error would make a
screen that scolds the user just for opening it. Only the aggregates' frame is replaced; the options, the target calendar dates
and the best sellers stay.

**A reversed order is shown as rejected input.** It means the submitted values cannot be accepted as is, so this one carries the
error color. Date order is also shown where the dates are chosen, but a swapped pair can still be submitted
([functional requirements](page.function.md)).

**Neither has a role for screen readers.** Both appear only in the display at the moment of opening, never as the result of an
interaction. Attaching a change-announcing mechanism to text that is there from the start only adds preamble.

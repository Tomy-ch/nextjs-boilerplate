# `/admin` Dashboard (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).
>
> The layout shell's promises are held by [`layout.screen.md`](layout.screen.md).

A screen for reading only "how things stand now" right after opening the admin side.

## What It Shows

| Region | Content |
| --- | --- |
| Heading | The screen's name and what can be learned here |
| Metric cards | Sales, sales count, published products, registered products |
| Counts by status | Horizontal bars side by side with a table of numbers |
| Link to aggregates by period | At the very bottom |

## No period selection

**This is the page read right after opening.** Adding a selection step costs extra actions for the most common use, "look at
today first". Comparing across periods belongs to [`analytics/page.screen.md`](analytics/page.screen.md), and this screen only
places a link to it.

**The link's name uses the destination's name as its stem.** It takes the destination's name as listed in the sidebar links and
appends 「を見る」 ("view"), giving 「期間別の集計を見る」 ("view aggregates by period"). Text that reads as if a period can be chosen
right here does not reveal it is a navigation until pressed. Keeping the destination's name as the stem shows that it points to the
same place as the sidebar link.

## Metric cards always carry their caveats

The four cards shown **split into three populations**. Without caveats, readers read them as the same population over the same period.

| Card | Population |
| --- | --- |
| Sales / sales count | Excludes cancellations, includes unpaid purchases |
| Counts by status (the region below) | Includes cancellations |
| Published products / registered products | The master's current values, independent of the period |

**The caveat sits in the same frame as the value.** Outside the card, its position does not tell which number it qualifies.

**Neither totals nor ratios are shown.** None of these may be added together. Any number the screen could build is a number the
backend did not return.

## Clickable and non-clickable cards

**Only cards with a page listing their contents are clickable.** If the count at the destination differs from the number, one of
them reads as wrong.

| Card | Clickable |
| --- | --- |
| Published products | No. There is no list of only published products, and sending to the admin list shows more than this number |
| Registered products | Yes. The admin list returns unpublished ones too, so the unfiltered list is exactly this number |
| Sales / sales count | No. The contract has no fetch endpoint that lists purchases across customers |

**Clickability is always shown by an arrow.** If only the frame's color changes, whether the card is clickable is unknown until
touched.

**The whole card is clickable, but it is not wrapped in a link.** Wrapping it would make screen readers read even the caveat as
the destination's name. The heading's link is stretched over the whole card with a pseudo-element, so assistive technology sees
only the heading as the destination.

## The breakdown pairs bars with a table

**Bars are for grasping relative size; the table holds the numbers themselves.** Bars alone make information readable only by
shape and color.

**Horizontal bars.** What is listed are status names, strings of varying length; with vertical bars the axis labels get rotated or
truncated.

**No tooltip and no legend.** A tooltip appears only while the pointer is over it, so it cannot be reached by touch or keyboard;
a legend has nothing to explain where there is only one series. The means of reading the numbers is the table.

**No re-sorting.** The contract returns rows in the status master's display order. Re-sorting by count moves row positions every
time the period changes, and the same status can no longer be followed.

**The entrance animation is disabled.** The bars grow from zero width, but their shape before reaching full width can be read as
"the bar for that count". Disabling it also keeps baseline images independent of capture timing.

## What Changes with Width

| Width | Metric cards | Breakdown |
| --- | --- | --- |
| A side list fits | 4 columns | Bars and table side by side |
| It does not fit | **Keep 2 columns** | Bars then table, stacked |

**Keep 2 columns even on the narrow band.** Stacking the 4 cards vertically pushes the breakdown below out of the first screen,
forcing scrolling even on users who come only to glance at the numbers. Values are aligned by digit so they can be compared with
their neighbor even in narrow columns.

The band boundaries are held by [0051](../../../adr/0051-styling-system.md).

## Loading and Empty

**Loading is shown as the card frames and the height of the bars that follow.** Substituting a single spinner changes the height
the moment content renders and moves whatever sits below.

**For a period with no purchases yet, show neither bars nor table; say so in one sentence.** The contract returns an empty array.
An empty table gives the reader nothing.

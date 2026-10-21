# `/` Top (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The entry point for starting to look for products. It lines up three ways in: new arrivals, best sellers and categories.

## What It Shows

| Area | Content |
| --- | --- |
| (Opening) | The caveat that this is a sample, and a link to the terms of use |
| Heading | The screen's name and a one-line description |
| New arrivals | Recent products, and a link out to the list |
| Best sellers | Ranked rows |
| Categories | Links into the list filtered by category |

## Caveats

**Placed before the heading.** Since it lists plausible-looking product and company names, without it the content would be
mistaken for real transactions. Unless it is where the eye lands before starting to read, writing it means little.

It conveys three things — that this is a sample, that the listings do not exist, and that purchasing and payment do not work.

**The link to the terms of use is placed in the same caveat.** Since viewing is deemed consent, the user must reach what they are consenting to
first, and a position reachable only by going down to the footer does not hold.

This place does not hold the detailed explanation. [`/about`](../site-info/about/page.screen.md) and [`/terms`](../site-info/terms/page.screen.md)
hold it, and this stays short.

## Section Order

**Placed in the order: a strip with images, a strip of rows, a strip of small links.** When strips of the same density follow one another, it becomes hard to read
where one section ends.

## How Each Section Is Shown

### New Arrivals

**Laid out in a grid.** Each item stacks image, name and price vertically, and the whole item is a link to the product's detail.

**The number of columns is decided by the container's width** ([docs/rules.md](../../../rules.md#layout): "do not branch a component's content on the band (viewport)"). Two columns in a narrow container, four
in a wide one. The number is decided by the container rather than by the band's name because this section sits within the body's width, which does not match
the screen's width.

**Only the images visible first are preloaded.** Preloading every item would make off-screen images compete with the first paint for
bandwidth. The number preloaded matches what fits in the first row of the widest container. The number of columns is decided by the container's width and
is unknown before rendering, so it errs toward the side where the first row is never short at any width.

**A link to the list is placed next to the heading.** Next to the heading rather than at the end of the section, so that at the moment the user
looks at what is listed and wants "to see more," their gaze does not have to go back up to the heading.

### Best Sellers

**Rank, product name, number sold and price are laid out on one row.** The product name carries the destination and leads to the detail.

**The rank is shown as a number.** That items are ordered from the top can be read from the order, but which rank each is can only be conveyed
by a number. Numerals and counts are tabular so that digits align across rows.

**Separators go between rows.** But not above the first row — that would create a double line with the heading.

### Categories

**Category names are listed, and pressing one leads into the list filtered by that category.** Counts are not shown. Showing counts on the top page
would mean counting per category, which is not a fetch the entry-point screen should bear.

**They wrap.** The contract decides both the number of categories and the length of their names, so fitting on one line is not assumed.

## Failed Sections

**The section's content is replaced with a notice.** The heading vanishes with it, so the notice itself names which section failed.

**The notice is shown at warning strength.** The whole screen has not broken, and the other sections are readable.

**The categories section does not fall under this treatment.** It sits on the static shell's side and is never served unread
([`page.function.md`](page.function.md)).

## Related

- Implementation `src/features/home/` — [README](../../../../src/features/home/README.md)
- The outer frame's promises — [`layout.screen.md`](layout.screen.md) / [`layout.function.md`](layout.function.md)
- Destinations — [`/products`](products/page.screen.md) / [`/products/[id]`](<products/[id]/page.screen.md>)

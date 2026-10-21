# `/about` About This Site (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

A screen that explains what this site is for, what it is built with, and what does not work.

## What It Shows

| Section | Contents |
| --- | --- |
| (Heading) | The screen's name and one sentence on what it explains |
| (Opening) | A warning that this is a sample |
| What the site is for | That it exists to see the published code running |
| What it is built with | That it has a sample-removal feature; cards for the two repositories |
| What does not work | Purchases, payment, email, inquiries and delivery tracking, and that the dates, counts and amounts shown are demo values |
| About maintenance | That it happens without notice, and is not announced on the notices screen |
| Using the site | A path to the terms of use |

## What Not to Write

**Do not use design names.** How layers are divided and where responsibilities sit are not decision material for users who came to try
this site. Those who want to read about it go to the repository, so the path in the footer is enough.

**Do not write a disclaimer.** [`/terms`](../terms/page.screen.md) holds it. Putting the same text in two places makes it possible to end up with only one of them
fixed. From here, show only a path to it.

## Repository Cards

**The whole card leads to the repository, but it is not wrapped in a link.** Wrapping it would put the action that opens the supplementary note inside
the link, an action inside an action. The name link is stretched over the whole card with a pseudo-element, and the supplementary action is
placed after it and raised above the overlap with `relative` (the same shape as the product card).

The destination assistive technology sees is the repository name, not "the text of the whole card".

The `[リポジトリの補足]` inside the card opens a popover showing that repository's **purpose** and **what it can do**.
It is not a dialog because the content assumes the user returns to the card after reading, and it does not warrant covering the screen and stopping
the operations behind it.

**The repository declarations are one table** ([README](../../../../../src/features/site-info/README.md)).
The footer path, the cards and the supplementary surface read the same thing. Holding them separately leaves a name or URL stale on one side only.

## Related

- Implementation `src/features/site-info/about/` — [README](../../../../../src/features/site-info/README.md)
- [`/terms`](../terms/page.screen.md) / [`/privacy`](../privacy/page.screen.md)

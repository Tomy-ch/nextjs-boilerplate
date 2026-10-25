# `/admin/campaigns/new` Defining a Campaign (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

A single form, read back in a confirmation before it is sent.

## What It Shows

**One form, top to bottom:** the code, the discount, the scope, the period, the limits. Every field is on one page because a
definition is entered once and checked as a whole; nothing in it depends on a step taken before.

**No defaults are placed.** A pre-filled date or limit looks like a decision someone made.

**The discount amount field appears once a kind is chosen.** A fixed amount is typed in dollars and a rate as a percentage; the
same field would mean two different things, and nothing would say which one was meant. **The cap field appears only for a rate.**
Switching to a fixed amount keeps a cap already typed, and switching back restores it.

**The scope's target field appears with its kind.** A category is chosen from the list; a product is found by typing part of its
name, and the candidates follow what was typed.

**The time zone dates are typed in is stated above the period fields.** Each date field says what it means for receiving or using
— the end is the first moment the code no longer works.

## How Errors Are Shown

**An error appears only after the field is touched, and opening the confirmation shows every remaining one.** A form that turns red
as soon as it opens blames someone who has done nothing yet.

**Order relations are shown before sending** — an end before the start, an expiry before the end, a per-user limit over the total —
on the later field of the pair. The backend still judges them.

**Once a field is changed, the previous result is cleared.** Keeping it shown makes a fix look unfixed.

## Confirmation

**The confirmation states that a definition cannot be changed afterwards, that the same code cannot be used again, and that
distribution can be stopped.** It reads back every value in words — the discount as 「15% 引き（1 回 20 ドルまで）」, an empty
optional field as what it means (「受け取った時点から」 / 「なし」) rather than as a blank.

**Failures that do not point at a field are shown inside the confirmation**, beside the send control, so the person can send again
from where they are.

**While the outcome of a submission is open, the form is held.** A line above the form says why — 「前回の定義の結果が分かるまで、
内容は変えられません。同じ内容でもう一度定義してください。」 — and the fields cannot be changed; the confirmation can still be opened to
send the same content again.

## Loading

**Until the category options are in, show only frames in the shape of the form.** Substituting a single spinner changes the height
the moment content renders.

## Responsive Layout

**Fields that belong together sit side by side on wide bands and stack on narrow ones** — the amount and its cap, the period's
dates, the limits and the minimum purchase.

## When Leaving

**Confirm when the user tries to leave the screen with input half-written.** Nothing is saved until submission. The browser's back
and forward are not blocked
([`navigation-guard`](../../../../../../src/components/app-starter/navigation-guard/README.md)).

## Breadcrumbs

**キャンペーン一覧 > 新規作成** (Campaign list > New). The layout shell holds the position of the path to the current location, and
this screen passes its content.

## Checking in the Catalog

Storybook's `Page/Admin/Campaigns/New` holds the empty and filled form, field errors, a reversed period, the confirmation, sending,
a used code, rejected fields, a rejection without fields, and the held form while an outcome is open, on desktop, tablet and
smartphone. Neither submission nor navigation happens in the canvas. The loading appearance is held by
`Features/Admin/Campaigns/New/Skeleton`; the discount and scope inputs by `Features/Admin/CouponDiscountFields` and
`Features/Admin/CouponScopeFields`.

## Related

- [`../page.screen.md`](../page.screen.md) — the list that leads to this screen and that it returns to

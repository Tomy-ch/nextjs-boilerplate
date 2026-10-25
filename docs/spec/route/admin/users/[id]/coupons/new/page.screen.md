# `/admin/users/[id]/coupons/new` Issuing a Coupon to One User (Screen Requirements)

> Functional requirements: [`page.function.md`](page.function.md).

The recipient, then a single form, read back in a confirmation before it is sent.

## What It Shows

**The recipient first, as something read rather than chosen** — the name and email address, with a line saying the recipient cannot
be changed here and where to go to issue to someone else.

**One form below it, top to bottom:** the discount, the scope, the expiry, the usable-from date and the minimum purchase. **No
defaults are placed.** The discount and scope fields behave as on the campaign definition screen
([`../../../../campaigns/new/page.screen.md`](../../../../campaigns/new/page.screen.md)).

**A closed account shows no form** — only the recipient, a plain statement that a coupon cannot be issued to a closed account, and a
way back to the list.

## How Errors Are Shown

**An error appears only after the field is touched, and opening the confirmation shows every remaining one.**

**A usable-from date at or after the expiry is shown before sending**, on the usable-from field. The backend still judges it.

**Once a field is changed, the previous result is cleared.**

## Confirmation

**The confirmation names the recipient and states that the issuance cannot be undone, revoked or changed.** It reads back every
value in words, and an empty optional field as what it means (「発行した時点から」 / 「なし」).

**Failures that do not point at a field are shown inside the confirmation**, beside the send control.

**While the outcome of a submission is open, the form is held.** A line above the form says why — 「前回の発行の結果が分かるまで、
内容は変えられません。同じ内容でもう一度発行してください。」 — and the fields cannot be changed.

## After Success

**The form gives way to a report** — 「<name> さんにクーポンを 1 枚発行しました」 and the content read back — that stays after the
confirmation closes, says it disappears on reload, and offers 「続けて発行する」 and the way back to the list.

**When the recipient is lost on sending**, the form gives way to the same surface as a closed account, worded as a failure, with
only the way back.

## Loading

**Until the recipient and the category options are in, show only frames in the shape of the screen.**

## Responsive Layout

**Fields that belong together sit side by side on wide bands and stack on narrow ones.**

## When Leaving

**Confirm when the user tries to leave the screen with input half-written.** Not when the form has been replaced by a report or a
closed-account surface. The browser's back and forward are not blocked
([`navigation-guard`](../../../../../../../../src/components/app-starter/navigation-guard/README.md)).

## Breadcrumbs

**利用者一覧 > <name> > クーポンの発行** (User list > the recipient > Issuing a coupon). When the recipient cannot be read, the name is
left out rather than the trail failing.

## Checking in the Catalog

Storybook's `Page/Admin/Users/CouponNew` holds the empty and filled form, field errors, a usable-from after the expiry, the
confirmation, sending, the success report, a closed account, a recipient or a scope target lost on sending, rejected fields, a
rejection without fields, the held form while an outcome is open and a conflict, on desktop, tablet and smartphone. The parts are
under `Features/Admin/Users/CouponNew`; the discount and scope inputs under `Features/Admin/CouponDiscountFields` and
`Features/Admin/CouponScopeFields`.

## Related

- [`../../../page.screen.md`](../../../page.screen.md) — the user list whose rows lead to this screen

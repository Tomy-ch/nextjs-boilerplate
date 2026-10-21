# `/mypage/edit` Edit Profile (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen that rewrites the registered information. A route independent of my page.

## What It Shows

Nine fields divided into three sections.

| Section | Fields |
| --- | --- |
| Basic information | Family name, given name (side by side) |
| Contact | Email address, phone number |
| Address | Postal code (with `[住所を検索]`), prefecture, city / ward / town / village, block and street number, building name |

The required / optional marker is placed before the label. 「必須」 ("Required") and 「任意」 ("Optional") are both two characters, so the marker column and the label's
starting position line up at the same time. The marker is `aria-hidden`, and that a field is required is conveyed by the control's `aria-required`.

The prefecture is a plain select. The options are static and fixed in number, so there is no reason to bring in a searchable client island.

## How Errors Are Shown

**Errors appear when focus leaves. While focused, it only acts in the direction of clearing the display**
(reward early, punish late; [0062](../../../../../adr/0062-form-input-validation.md)).

| Operation | Display |
| --- | --- |
| Emptying a field with a valid value while it is focused | Not shown |
| Moving focus away | Shown |
| Focusing and fixing it | **Cleared on the spot** |
| Breaking it again while focused | Stays at the same text as when focused |

The implementation needs two things. Form revalidation **only takes effect after submit**, so the starting point of validation is placed at
"once touched"; and on top of that, the display while focused is capped at "the text as of when focus arrived."
Without the latter, deleting a single character while trying to rewrite would bring up 「入力してください」 ("Please enter a value").

## How Address Autocomplete Looks

That completion happened is announced. A mere change in the field's value does not reach a user who is not looking there.
There is no loading text (with a fast response it would swap with the result and back, making the text flicker).

## Submission Result

Even on success the screen does not move; a toast reports it. It is a save that stays in the form's context
([0063](../../../../../adr/0063-mutation-result-notification.md)).

## Breadcrumbs

`マイページ > プロフィール編集` is placed. It has an ancestor that cannot be reached in one step from the global nav
([0026](../../../../../adr/0026-layout-shell-mount.md)).

## Checking in the Catalog

`/api/addresses` does not exist in Storybook, so the response is replaced inside the story. The postal codes that can be looked up
are `150-0001` (the town area splits) and `220-0012` (resolved down to the town area); anything else has no match.
See the [feature README](../../../../../../src/features/account/README.md) for details.

## Related

- Implementation `src/features/account/edit/`
- Neighboring screen [`/mypage`](../page.screen.md)

# `/mypage` My Page (Screen Requirements)

> Functional requirements are in [`page.function.md`](page.function.md).

The screen where the user checks their registered information and purchase summary, and proceeds to editing, account closure or the site description.

## What It Shows

| Area | Content |
| --- | --- |
| Profile | Name, email, phone and address, and a link to editing |
| Purchase summary | Total count and total amount, and the breakdown by status. A link that opens the details |
| Operation row | About this site / Privacy policy / Account closure |

## Purchase Summary Detail

`[もっと見る]` ("See more") on the summary card opens a dialog. The columns are **注文日時 / ステータス / 購入コード / 金額** (order date and time / status / purchase code / amount).

When what is listed is not everything, the description says so. Cutting it silently makes it look as if older purchases do not exist.

## Account Closure

`[退会する]` ("Close account") opens a confirmation dialog. It runs as a submit inside the dialog, and `AlertDialogAction` is not used
(because it closes the dialog when pressed, and the in-flight display and failure text would appear where the user is not looking).

Only when it did not go through because a purchase is in progress is a dedicated message shown.

## Responsive Layout

| Width | The two reading cards | Operation row |
| --- | --- | --- |
| `lg` and up | Two columns side by side | All three at equal width in one row |
| `sm`–`lg` | Stacked | All three at equal width in one row |
| Below `sm` | Stacked | Stacked. **Separated one by one with divider lines** |

The columns stop at two because with three, each card's width shrinks to where an address or a table row wraps,
making the wide screen the harder one to read.

The operation row is equal width to even out the pressable areas. Sizing by text length would make only 「プライバシーポリシー」 ("Privacy policy")
wide and account closure narrow. Divider lines go in on narrow widths because merely stacking makes adjacent
buttons look like one group and invites mispresses.

## Breadcrumbs

None. The global nav points directly at this screen, and the hierarchy is one level deep
([0026](../../../../adr/0026-layout-shell-mount.md)).

## Empty State

When there are no purchases at all, the summary card stays and the table is replaced with 「まだ購入がありません。」 ("No purchases yet."), and
`[もっと見る]` becomes unpressable. A table with only its columns looks more like "loading
failed" than like a summary of 0.

## Related

- Implementation `src/features/account/mypage/` — [README](../../../../../src/features/account/README.md)
- Neighboring screen [`/mypage/edit`](edit/page.screen.md)

# AdminShell

## 用途

管理画面の外枠を組みます。脇の導線一覧・header・skip link・`main` をまとめ、どの管理画面でも同じ位置に置きます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `AdminShell` | 脇の導線一覧 / header / skip link / `main` を持つ外枠です。 |
| `AdminShellNav` | まとまりごとに導線を並べ、いま開いている画面に印を付ける一覧です。 |
| `AdminShellMenu` | `lg` 未満で脇の一覧を畳む overlay です。 |
| `AdminShellNavToggle` | 脇の一覧を畳む・開く操作です。 |
| `AdminShellNavStateProvider` / `useAdminShellNav` | 脇の一覧の開閉を持ち、外枠の属性として出します。 |

`admin-shell.definition.ts` は、導線とそのまとまりの型（`AdminShellNavItem` / `AdminShellNavGroup`）と、`main` の `id` と header の高さを持ちます。

## 利用ケース

管理側の route group の layout で一度だけ使います。器をどこに mount するかは [0026](../../../../docs/adr/0026-layout-shell-mount.md) が決めます。

現在地までの階層は `breadcrumb` へ渡します。位置は器が持ち、中身は渡す側が組みます。

## 責務境界

利用者向けの [`AppShell`](../app-shell/README.md) とは別の器です。1 枚にまとめると、見せる相手で導線を差し替える分岐を器の中に抱えます。

導線を横ではなく脇へ置くのは、増える方向が縦だからです。管理の操作は対象ごとに増え、横並びの header は増えるたびに畳む幅が上がります。

脇に一覧を常設するのは `lg` 以上だけで、それ未満は `AdminShellMenu` の overlay へ畳みます。タブレットの縦持ちは `md` 以上 `lg` 未満に集中しており、その帯で脇に幅を割くと本文に残る幅がモバイルとほとんど変わらないためです。

**`main` は幅を絞りません。** 読み幅と左右余白は [`ContentContainer`](../content-container/README.md) の責務です。

管理の系統（`data-surface`）はこの器が名乗ります。配下の部品は token を引き直すだけで、改修は要りません。

`headerActions` と `navFooter` の中身は知りません。利用者向け画面へ戻る導線もその 1 つで、器は行き先を持ちません。

器は紙に出しません。

`AdminShell` は Server Component のままです。開閉の状態・脇の一覧・開閉の操作・overlay が hydration を要する client island です。

## Storybook とテスト

Storybook（`Layout/AdminShell`）は既定の構成、脇の一覧を畳んだ状態、まとまりを畳んだ状態、一覧の下端に要素を置いた構成、階層を置いた構成、tablet と mobile の viewport、それぞれで overlay を開いた状態を確認します。テストは本文が `main` に入ること、skip link の飛び先、サイト名と管理側の名称の行き先、導線と下端・header の要素、階層の区画を中身が空なら残さないこと、開閉と、畳んでも導線が器から消えないことを確認します。

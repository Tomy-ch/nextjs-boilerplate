> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# AppShell

## 用途

利用者向け画面の外枠を組みます。header・導線・skip link・`main`・footer をまとめ、どの画面でも同じ位置に置きます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `AppShell` | header / nav / skip link / `main` / footer を持つ外枠です。 |
| `AppShellMenu` | 狭い画面で header の導線を畳む side menu です。 |
| `AppShellMenuFallback` | `AppShellMenu` が届くまで同じ大きさで場所を占める、押せない枠です。 |
| `AppShellNavLink` | 導線 1 件をレンダリングする link です。side menu の中では履歴を積まずに移ります。 |

`app-shell.definition.ts` は、導線 1 件の型（`AppShellNavItem`）と、`main` の `id` と header の高さを持ちます。

## 利用ケース

利用者向けの route group の layout で一度だけ使います。レイアウトシェルをどこに mount するかは [0026](../../../../docs/adr/0026-layout-shell-mount.ja.md) が決めます。

導線を 1 つも持たないレイアウトシェル（`navItems` も `navSlot` も空）では、header の `nav` 自体を置きません。中身の無い landmark は、支援技術の一覧に行き先の無い項目として残るためです。

主体を知らなければ決まらない導線（ログイン状態で変わる項目など）は `navItems` へ混ぜず、`navSlot` と `menuNavSlot` へダイナミックホールとして渡します。`navItems` に待つものを混ぜるとレイアウトシェルそのものが待つことになり、このレイアウトシェルを通る画面がすべて動的レンダリングになります。

## 責務境界

**`main` は幅を絞りません。** 読み幅と左右余白は [`ContentContainer`](../content-container/README.ja.md) の責務です。

skip link を先頭に置くのは、キーボードと支援技術の利用者が header の導線を毎回辿らずに本文へ入れるようにするためです。

`sidebar` と `headerActions` の中身は知りません。置き場所だけを用意し、何を出すか・いつ出すか・どれだけの幅を取るかは渡す側が決めます。

レイアウトシェルは紙に出しません。header・footer・skip link は画面を渡り歩くためのもので、紙の上では押せず場所を取るだけです。

管理画面は別のレイアウトシェル（[`AdminShell`](../admin-shell/README.ja.md)）を持ちます。見せる相手も導線も違うため、1 枚にまとめると分岐をレイアウトシェルの中に抱えます。

`AppShell` は Server Component です。`AppShellMenu` だけが開閉のために hydration を要する client island です。

## Storybook とテスト

Storybook（`Layout/AppShell`）はデフォルトの構成、脇に領域を並べた構成、狭い viewport、side menu を開いた状態、導線を持たない構成、side menu の導線を slot からだけ受け取る構成を確認します。テストは本文が `main` に入ること、skip link の飛び先、header の導線と footer、狭い画面で side menu から導線を開けること、side menu の導線が履歴を積まないこと、導線が無ければ header の `nav` を置かないことを確認します。

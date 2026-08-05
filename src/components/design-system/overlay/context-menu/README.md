# ContextMenu

## 用途

対象を右クリックしたときに、その対象に固有の操作を手元へ出します。一覧や編集画面で操作を繰り返す利用者が、可視の menu へ辿らずに済むようにするための加速手段です。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ContextMenu` | 開閉状態を管理する client-side root です。 |
| `ContextMenuTrigger` | 右クリックの対象になる領域です。子として渡した要素そのものが対象になります。 |
| `ContextMenuContent` | Portal へ表示する menu 本体です。`role="menu"` を持ちます。 |
| `ContextMenuItem` | 選ぶと操作を実行する項目です。`variant` で取り消せない操作を区別します。 |
| `ContextMenuCheckboxItem` / `ContextMenuRadioItem` | 選択状態を持つ項目です。`menuitemcheckbox` / `menuitemradio` として読み上げられます。 |
| `ContextMenuRadioGroup` | 単一選択の項目群をまとめ、選択値を扱います。 |
| `ContextMenuGroup` / `ContextMenuLabel` / `ContextMenuSeparator` | 項目群のまとまり・名前・区切り線を構成します。 |
| `ContextMenuSub` / `ContextMenuSubTrigger` / `ContextMenuSubContent` | 入れ子の menu を構成します。 |
| `ContextMenuShortcut` | 項目の右端へ対応するキーボード操作を表示します。 |
| `ContextMenuPortal` | menu の描画先を差し替える場合に使います。`ContextMenuContent` は内部で Portal を通すため、通常は不要です。 |

項目の見た目の値集合は、`context-menu.definition.ts` が `CONTEXT_MENU_ITEM_VARIANT` として公開します。

## 利用ケース

- 一覧の行や item grid で、可視の menu と同じ操作へ素早く到達させる場合
- 対象が多数あり、行ごとに操作ボタンを置くと画面が埋まる場合

## 責務境界

SSR first の選定では `△` に当たります。既定は通常の link / button と可視の menu であり、右クリックからの加速が必要になった場合にこの client island を選びます。開閉と focus 管理のため hydration が必要で、Server Component からは直接 render できません。項目の内容自体に client runtime が要らない場合は、Server Component で組み立てた要素を `children` として渡します。

**この menu にしか無い操作を置いてはいけません。** 開く手段は pointer の副ボタン・touch の長押し・keyboard の Context Menu キー（Shift+F10）だけで、画面上に trigger が現れません。存在に気付く手掛かりが無く、`ContextMenuTrigger` が focus を受け取らないため、領域内に focus 可能な要素が無ければ keyboard からは開けません。同じ操作へ到達できる可視の導線を feature 側に必ず用意します。行ごとの操作なら `RowActions`、trigger を伴う menu なら `DropdownMenu` がその役割を担います。

`ContextMenuTrigger` が覆う範囲では browser 既定のコンテキストメニューが開かなくなり、画像の保存やリンクのコピーも使えなくなります。覆う範囲は操作対象の要素に限ります。

操作の実行内容、遷移先、権限判定、確認 UI は持ちません。`variant` に `destructive` を指定できますが、これは配色だけを変えます。取り消せない操作の確認は、選択後に `AlertDialog` を開いて確定させます。

`ContextMenuShortcut` は表示だけを担い、キーの割り当ては行いません。実際の shortcut は呼び出し元が別途実装します。割り当てていない表記を置くと、押しても何も起きない案内になります。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は基本構成、可視の `DropdownMenu` と併置した構成、見出しと群・選べない項目、選択状態を持つ checkbox / radio 項目、入れ子の menu を確認します。Radix の context menu は開いた状態を story の初期値として固定できないため、いずれも対象領域を右クリックして確認します。

テストは開くまで menu を描画しないこと、`contextmenu` で `role="menu"` と項目が現れること、項目を選ぶと操作を実行して閉じること、disabled 項目、Escape での閉じ、shortcut が表示だけでその打鍵では操作を実行しないこと、checkbox / radio の役割と選択状態、入れ子 menu の展開、a11y 自動検査を確認します。keyboard の Context Menu キーは browser が同じ `contextmenu` イベントを発火するため、同じ経路として扱います。

a11y 自動検査では `color-contrast` に加えて `region` を無効化します。`region` は「ページの内容がすべて landmark に含まれるか」を見る page 単位の best-practice 規則であり、landmark を持たない component 単体の render と、Portal で `body` 直下へ出る内容の両方に構造上適合しません。

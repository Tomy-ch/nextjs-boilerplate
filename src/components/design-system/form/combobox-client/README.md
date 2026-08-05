# ComboboxClient

## 用途

候補が多い選択肢から、入力語で絞り込みながら 1 件を選びます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ComboboxClient` | trigger・絞り込み入力・候補一覧・選択値の hidden input を一つにまとめた client island です。 |
| `ComboboxClientOption` | 候補 1 件を表す型です。`value`（送信値）・`label`（表示と検索の対象）・`disabled` を持ちます。 |

## 利用ケース

- 都道府県やカテゴリのように、候補が多く一覧から探すのが難しい選択
- 表示文言で検索したいが、送信する値は識別子である選択

候補が少なく静的なら `SelectNative` を優先します。絞り込みの必要がないのに使うと、選ぶまでに入力という手数が増えるだけになります。

## 責務境界

**shadcn CLI の単独部品ではなく、`Popover` と `Command` を合成した実装パターンです。** `date-picker-client` と同じ位置づけで、`shadcn-manifest.yaml` にも登録していません。shadcn registry の `combobox` は別の headless ライブラリを前提としており、このリポジトリが採る vendor と一致しないため copy-in していません。

hydration が必要で、Server Component からは直接 render できません。選択値は hidden input として持つため、native form へそのまま載ります。

候補の取得・並び順・件数の制限は持ちません。`options` として渡された配列をそのまま扱い、絞り込みは `Command` が label に対して行います。サーバ側で検索する必要がある場合は、呼び出し元が `options` を差し替えます。

**必須指定は持ちません。** 値を運ぶ hidden input は constraint validation の対象外であり、`required` を付けても browser は検証しません。必須であることの表示は `Field`、実際の強制は Server Action や server 側の検証で行います。

### アクセシビリティ

**trigger に `role="combobox"` は付けません。** 絞り込み入力そのものが `Command` の中で `role="combobox"` として公開されるため、trigger にも付けると combobox が二重になり、`aria-controls` の関連付けも競合します。trigger は popover を開く button であり、開閉は Radix が `aria-expanded` に反映します。

trigger は選択状態によって文言が変わるため、`aria-label` か `aria-labelledby` で**アクセシブルな名前を必ず与えます**。絞り込み入力の名前は `Command` の `label` として内部で渡しています。

絞り込みは label に対して行います。`CommandItem` の `value` は form へ送る値で表示文言と異なるため、label を `keywords` として渡して検索対象にしています。読みは正規化されないため、かな入力で漢字の候補を引かせたい場合は、呼び出し元が読みを含む `label` を用意します。

## Storybook とテスト

Storybook は未選択、選択済み、選べない候補を含む場合、文言を差し替える場合、操作できない状態、外の `Label` を `aria-labelledby` で名前にする場合、制御 component として送信値を併記する場合を確認します。

テストは開くまで候補一覧を出さないこと、未選択時の placeholder と hidden input が空であること、選択済みの値に対応する label を trigger へ出すこと、trigger が combobox ではなく button として公開されること、開いたときの絞り込み入力と候補、label による絞り込み、一致なしの文言、選択による hidden input への反映と閉じ、呼び出し元への通知と制御 component としての反映、`disabled` の候補が選べないこと、trigger の無効化、a11y 自動検査を確認します。

cmdk と Popover は jsdom に無い `scrollIntoView` と `ResizeObserver` を使うため、`command` と同じくテスト側で補っています。

# MultiSelectClient

## 用途

候補を畳んだまま、複数の値を同時に選びます。選んだ結果は trigger に要約として出ます。

## 役割と公開 component

| Component / 型 | 役割 |
| --- | --- |
| `MultiSelectClient` | trigger と候補の overlay をまとめた client island です。値は hidden input として運びます。 |
| `MultiSelectClientOption` | 並べる候補 1 件の形です。送信する値・表示する文言・選べるかどうかを持ちます。 |
| `MultiSelectClientProps` | 公開 props です。 |

## 利用ケース

- 一覧の絞り込みで、複数の分類や状態を同時に効かせる場合
- 候補が 10 件前後までで、入力による絞り込みを要さない場合

## 責務境界

**確定の操作を持ちません。** checkbox を押した時点で `onValueChange` が飛びます。即座に反映するか、
下書きに留めてまとめて確定するかは呼び出し元が決めます。overlay の中では結果が隠れるため、狭い段で
まとめて確定させたい場合は、呼び出し元が下書きの状態を持ちます。

**候補の取得・並び順・件数の制限を持ちません。** `options` として渡された配列をそのまま並べ、
表示順は渡された順です。

**選択の順序を持ちません。** `onValueChange` が渡す配列は常に候補の並び順です。押した順に積むと、
同じ組み合わせでも URL の並びが変わり、同じ条件が別のリンクとして見えます。

**値は hidden input で運びます。** overlay は Portal で form の外へ出るため、中の checkbox に `name`
を与えても native の送信には載りません。選ばれた数だけ同じ名前の hidden input を trigger の側へ置く
ので、`categoryCodes=1&categoryCodes=2` のように**同じ名前の繰り返し**として送られます。

**必須指定を持ちません。** hidden input は constraint validation の対象外で、`required` を付けても
browser は検証しません。必須であることの表示は `Field`、実際の強制は Server Action や server 側の
検証で行います。

hydration が必要で、Server Component からは直接 render できません。

### 選ぶ基準

| 状況 | 使う部品 |
| --- | --- |
| 1 つだけ選ぶ / 候補が静的で少数 | `SelectNative` |
| 1 つだけ選ぶ / 候補が多く入力で絞り込む | `ComboboxClient` |
| **複数を同時に効かせる** | この component |

絞り込みの入力を持たないため、候補が overlay に収まらないほど多い用途には向きません。

### 名前の付け方

`aria-labelledby`（外の要素を指す）か `aria-label`（文言を直接渡す）のどちらかを**必ず与えます**。
overlay は `role="dialog"` を持ち、名前が無いと支援技術から用途を判別できません。

どちらの経路でも、trigger の名前は**「項目名 + 選択の要約」**になります。`aria-label` を属性のまま
置くと button の内容を上書きして要約が読み上げから消えるため、内部では常に `aria-labelledby` として
項目名の要素と trigger 自身の 2 つを指す形へ組み替えています。

**`role="listbox"` は与えません。** 中身は checkbox の集まりで、選択状態は各 checkbox が `checked`
として公開します。listbox にすると option の選択状態と checkbox の状態が二重になります。

## Storybook とテスト

Storybook は未選択・開いた状態・1 件選択・複数選択・複数選択で開いた状態・要約の差し替え・外の要素を
名前にする場合・呼び出し元が値を持つ場合・無効・候補なしを確認します。

テストは要約の組み立て（未選択 / 1 件 / 複数 / 差し替え）、checkbox の checked 反映、選択と解除で
送信値が増減すること、押した順ではなく候補の並び順で送ること、controlled のとき呼び出し元の値だけが
反映されること、名前が「項目名 + 要約」になること（`aria-label` / `aria-labelledby` の両経路）、
選べない候補が押せないこと、候補が空でも落ちないこと、無効なら開かないこと、a11y 自動検査を
確認します。

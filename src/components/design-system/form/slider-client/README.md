# SliderClient

## 用途

数値または範囲を連続的な操作で指定します。下限と上限を一つの操作面で選べる点が `SliderNative` との違いです。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `SliderClient` | track・選択範囲・thumb を組み立てる client island の form 部品です。値の配列から thumb の数を決めます。 |

## 利用ケース

- 価格帯のように、下限と上限を同時に指定する範囲入力
- 選択中の値を即時に別の表示へ反映する場合
- 選択済みの範囲を塗り分けて示したい場合（`SliderNative` は擬似要素の制約でこれができません）

単一の値を選ぶだけで足りる場合は、native form へそのまま載る `SliderNative` を使います。

## 責務境界

SSR first の選定では `◎` の例外に当たります。既定は `SliderNative` であり、catalog が client island の条件として挙げる**複数 thumb**または複雑な値同期が必要な場合にこちらを選びます。hydration が必要で、Server Component からは直接 render できません。値の保持と確定、`searchParams` への反映、送信は呼び出し元が持ちます。

`value` を渡すと制御 component、`defaultValue` を渡すと非制御 component として動きます。いずれも省略した場合は `min` を初期値とする thumb を一つ置きます。thumb の数は値の数と一致します。

名前を持つのは外枠ではなく**各 thumb** です。`slider` role は thumb 側に付くため、外枠へ `aria-label` や `aria-labelledby` を渡しても名前になりません。`thumbLabels` に値と同じ順序で名前を渡します。範囲入力では「下限価格」「上限価格」のように、どちらの端かが判る名前にします。

`aria-valuemin` / `aria-valuemax` は thumb ごとの可動域ではなく、slider 全体の `min` / `max` を指します。範囲入力で「下限は上限を越えない」ことを利用者へ伝えたい場合は、名前や併記テキストで補います。

`orientation="vertical"` で縦向きになります。その場合は高さを `className` で与えます。

track は `bg-border`、選択範囲は `bg-foreground` で、両者が light / dark いずれでも明確に分かれるようにしています。範囲入力では「どこからどこまでを選んでいるか」が唯一の情報なので、track と選択範囲の差はこの component の要件です。thumb は面が `bg-background`、輪郭が `border-foreground` で、選択範囲の上でも背景の上でも位置が判るようにしています。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は単一 thumb、範囲指定、`step` を指定した離散値、disabled、縦向き、制御 component として値を併記する場合を確認します。

テストは値の数だけ thumb が置かれること、`value` / `defaultValue` を省略したときの既定、`aria-valuenow` と全体値域を指す `aria-valuemin` / `aria-valuemax`、keyboard 操作による値の変更と呼び出し元への通知、制御 component としての反映、`thumbLabels` による thumb ごとのアクセシブルな名前、disabled、`className` の上書き、a11y 自動検査を確認します。

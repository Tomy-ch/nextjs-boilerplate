# SliderNative

## 用途

数値を連続的な操作で指定します。値そのものを打ち込むより、範囲の中のおおよその位置を選ぶほうが自然な入力に使います。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `SliderNative` | native `input type="range"` に既定の見た目を与える form 部品です。`value` / `min` / `max` / `step` を native 属性として受け取ります。 |

## 利用ケース

- 上限価格や表示件数のように、単一の数値を大まかに選ぶ場合
- 選んだ値を native form でそのまま送信する場合

下限と上限を同時に指定する範囲入力には thumb が足りないため、`SliderClient` を使います。

## 責務境界

SSR first の選定では `◎` に当たります。native `input type="range"` で必要な意味論と操作が満たせるため、`"use client"`・React state・browser API を持ちません。値の保持、`searchParams` への反映、送信後の処理は呼び出し元が持ちます。

`input type="range"` は screen reader に `slider` として公開され、値は `min` / `max` / 現在値から読み上げられます。要素自体は名前を持たないため、`aria-label` か、`label` 要素と `id` の関連付けで**アクセシブルな名前を必ず与えます**。`input` は labelable 要素なので `label` の `htmlFor` が使えます（`SliderClient` では使えません）。値は読み上げられる一方で画面上には出ないため、利用者へ数値を見せたい場合はテキストを併記します。

太さや幅は `className` で上書きします。track と thumb は browser ごとに別の擬似要素で描画されるため、`::-webkit-slider-runnable-track` / `::-webkit-slider-thumb` / `::-moz-range-track` / `::-moz-range-thumb` の四つへ指定しています。track は `bg-border`、thumb は `bg-foreground` です。focus 表示は `outline` で与えます。

**選択済みの範囲を塗り分けません。** track は端から端まで一色で、値は thumb の位置だけが伝えます。塗りを描く擬似要素は Firefox の `::-moz-range-progress` しかなく、Chrome / Safari には対応するものがありません。片方だけ塗ると browser 間で affordance が食い違い、`linear-gradient` で代替すると値の変化を追う JavaScript が必要になって、この component が client runtime を持たない理由を失います。塗り分けが必要な場合は `SliderClient` を使います。

shadcn/ui の `slider` はこちらへ copy-in していません。生成物は Radix の client component であり、単一値の入力に hydration を要求するためです。同じ生成物は `SliderClient` として取り込んでいます。

## Storybook とテスト

Storybook は既定の範囲、`step` を指定した離散値、範囲を実単位にした場合、disabled、`label` 要素との関連付け、native form に載せた場合を確認します。

テストは `slider` role として公開されること、`type="range"` であること、`min` / `max` / `step` / `name` が native 属性として出ること、操作で値が変わること、`label` 要素の関連付けによるアクセシブルな名前、disabled、`className` の上書き、a11y 自動検査を確認します。

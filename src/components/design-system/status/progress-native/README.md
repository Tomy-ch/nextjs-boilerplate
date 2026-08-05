# ProgressNative

## 用途

長さの決まった処理が今どこまで進んだかを、値と最大値の関係として視覚的に示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ProgressNative` | native `progress` 要素に既定の見た目を与える表示 primitive です。`value` と `max` を props として受け取り、進捗の割合だけを描画します。 |

## 利用ケース

- 手続きの段階表示のように、進捗が URL や Server 側で確定している場合
- 件数・段階のように、`max` が実単位を持つ処理の残りを示す場合

browser 側の計測値を短い間隔で更新する場合は `ProgressClient` を使います。完了時期が不明な待機には使わず、骨格を見せるだけでよい場合は `Skeleton` を使います。

## 責務境界

SSR first の選定では `◎` に当たります。native `progress` 要素で必要な意味論と表示が満たせるため、`"use client"`・React state・browser API を持ちません。値の取得、更新間隔、完了後の遷移、百分率の文言整形は呼び出し元が持ちます。

`value` は必須です。進捗不明（indeterminate）は表現の対象外にしています。native `progress` は `value` を省略すると不定表示になりますが、その描画は browser 実装に依存し、待機の表現は `Skeleton` が既に担っているためです。

`progress` 要素は screen reader に `progressbar` として公開され、値は `value` と `max` から百分率として読み上げられます。要素自体は名前を持たないため、`aria-label` か、`label` 要素と `id` の関連付けで**アクセシブルな名前を必ず与えます**。`progress` は labelable 要素なので `label` の `htmlFor` が使えます（`ProgressClient` では使えません）。`max` に実単位を使った場合も読み上げは百分率になるため、件数などを利用者へ見せたい場合は数値テキストを併記します。

太さや幅は `className` で上書きします。既定は `h-2 w-full`、track は `bg-border`、進捗部分は `bg-foreground` です。track と進捗部分は browser ごとに別の擬似要素で描画されるため、`::-webkit-progress-bar` / `::-webkit-progress-value` / `::-moz-progress-bar` の三つへ指定しています。この擬似要素の差が見た目の揺れとして問題になる場合は `ProgressClient` を使います。

shadcn/ui の `progress` はこちらへ copy-in していません。生成物は Radix の client component であり、確定値の表示に hydration を要求するためです。同じ生成物は `ProgressClient` として取り込んでいます。

## Storybook とテスト

Storybook は既定の表示、値が `0` の状態、`max` に達した完了状態、`max` を実単位にした場合、数値テキストを併記する場合、`className` で太さを変えた場合を確認します。

テストは `progressbar` role として公開されること、`value` と `max` が native 属性として出ること、`max` の既定が `100` であること、`aria-label` と `label` 要素の双方でアクセシブルな名前を与えられること、`className` の上書き、a11y 自動検査を確認します。

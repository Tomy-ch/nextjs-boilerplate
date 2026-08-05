# ToggleGroupClient

## 用途

関連する切り替えを 1 つの集合として並べ、選択を browser 側の state として即座に反映します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ToggleGroupClient` | 選択を保持する client-side root です。`type` で排他 / 複数を選びます。 |
| `ToggleGroupClientItem` | 集合の中の 1 項目です。`value` で識別します。 |

## 利用ケース

- URL にも form にも載せない、その場だけの表示切替
- 選択した結果を即座に別の表示へ反映する場合

選択を form の値として送る場合や URL へ載せる場合は `ToggleGroupNative` を使います。

## ToggleGroupNative との使い分け

| | `ToggleGroupClient` | `ToggleGroupNative` |
| --- | --- | --- |
| 実体 | button（Radix） | native の radio / checkbox |
| form の値 | 持たない | **そのまま送信される** |
| hydration | 必要 | 不要 |
| 項目間の移動 | roving tabindex（Radix） | browser 標準（radio は矢印キー） |

## 責務境界

SSR first の選定では `○` の例外に当たります。既定は `ToggleGroupNative` であり、URL にも form にも載せない即時切替が必要な場合にこちらを選びます。hydration が必要で、Server Component からは直接 render できません。

`value` を渡すと制御 component、`defaultValue` を渡すと非制御 component として動きます。選択の保存、URL への反映、送信は持ちません。

集合そのものは名前を持たないため、`aria-label` か `aria-labelledby` で**何の切り替えかを必ず示します**。矢印キーでの項目移動と roving tabindex は Radix が担います。

### `type` は意味論そのものを変える

| `type` | 集合の role | 項目の role | 選択の表れ方 |
| --- | --- | --- | --- |
| `single` | `radiogroup` | `radio` | `aria-checked` |
| `multiple` | `toolbar` | `button` | `aria-pressed` |

`single` では項目が `aria-pressed` を**持ちません**。選択中の見た目を両モードで示せるのは、`toggleVariants` が両者に共通する `data-state="on"` も見ているためです。項目の状態に応じた指定を呼び出し元で足す場合も、`aria-pressed` ではなく `data-state` を使います。

`variant` と `size` は集合で指定すると配下の項目へ引き継がれます。`spacing` を `0` にすると項目が隣接し、両端だけが丸い segmented control の見た目になります。値を大きくすると独立したボタンの並びになります。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は排他選択、複数選択（選択中の値を併記）、`outline` variant、`spacing` を空けた場合、大きさ 3 段階、選べない項目を含む場合を確認します。

テストは `single` が `radiogroup` / `radio`、`multiple` が `toolbar` / `aria-pressed` になること、選択中の項目が `data-state="on"` を持ちそこに面の指定が効くこと、排他的な切り替え、複数選択での配列通知、form へ送る値を持たないこと、`variant` / `size` の引き継ぎ、`spacing` の CSS 変数、disabled、a11y 自動検査を確認します。

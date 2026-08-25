# SearchFieldNative

## 用途

一覧画面のキーワード検索欄を、JavaScript を必要としない GET form として置きます。検索語は URL に載るため、結果は共有・履歴・戻る操作とそのまま整合します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `SearchFieldNative` | `search` 要素の landmark として、検索入力と送信ボタンを GET form にまとめます。引き継ぐ query を hidden input として復元します。 |

主な props は次のとおりです。

| props | 役割 |
| --- | --- |
| `label`（必須） | 検索入力のアクセシブルな名前です。視覚的なラベルを持たないため、これだけが「何を検索する欄か」を伝えます。 |
| `action` | 送信先です。`form` の native 属性をそのまま使います。 |
| `name` | 検索語を載せる query の名前です。既定は `q`。 |
| `defaultValue` | 初期表示する検索語です。現在の検索条件を反映する場合に渡します。 |
| `hiddenParams` | 送信時に引き継ぐ query です。hidden input として復元します。 |
| `submitLabel` | 送信ボタンの文言です。既定は「検索」。 |

## 利用ケース

- 一覧画面の上部に置く、キーワードで絞り込むための検索欄
- JavaScript が無効な環境でも到達できる必要がある管理画面の検索
- 打鍵ごとの反映を必要とせず、送信してから結果を見れば足りる検索

打鍵に追従して結果を変えたい場合は `SearchFieldClient` を使います。候補集合から選ぶことがゴールの UI には `Command` を使います。検索欄と候補選択は別物です。

キーワード以外の条件（状態・期間・価格帯など）も並ぶ画面では、この検索欄を [`FilterBar`](../../../patterns/filter-bar/README.md) の中へ置きます。`FilterBar` は検索欄を持たず、適用中の条件・件数・全解除の導線を束ねる外枠なので、排他ではなく入れ子の関係です。この component 単体で足りるのは、絞り込みがキーワードだけの場合です。

## 責務境界

SSR first の選定では `◎` に当たります。hydration を必要としない Server Component であり、client island を持ちません。

検索の実行、結果の取得、URL の組み立ては持ちません。送信先は `action`、引き継ぐ query は `hiddenParams` として呼び出し元が渡します。この分担は `Pagination` と同じで、`components` は URL を解釈しません。

見た目は `InputGroup` を合成して得ており、この component は独自の class を持ちません。検索アイコン付きの入力欄という見た目の owner は `InputGroup` 側にあります。

### 引き継ぐ query は呼び出し元が選ぶ

GET の form は送信時に URL の query をすべて捨てます。並び順や表示形式のように検索し直しても保ちたいものは `hiddenParams` へ渡します。逆に、ページ番号のように検索し直すと意味を失う query は**渡さないことで初期化**します。この取捨選択は画面の仕様であり、component 側では決められません。

### `search` 要素と landmark

支援技術の landmark 一覧から到達できます。同じ画面に検索欄を複数置く場合は、`aria-label` で landmark を区別します。

landmark は `role="search"` 属性ではなく HTML の `search` 要素で表します。browser は `search` 要素を `search` role へマップしますが、テストで使う `aria-query` 5.3.0 はまだこの要素を登録していないため、`getByRole("search")` からは引けません。これはツール側の未対応であり、実装を `div role="search"` へ戻して回避することはしません。テストは `data-slot` で要素を取得し、`search` 要素であることを直接検証します。

## Storybook とテスト

Storybook は既定の検索欄、補助文を添える場合、現在の検索条件を反映する場合、引き継ぐ query がある場合、送信ボタンの文言を変える場合、query の名前を変える場合を確認します。

テストは `search` 要素の landmark に GET の form を置くこと、`type="search"` と既定の query 名、query 名と初期値の指定、`hiddenParams` が送信値に含まれること、引き継ぎを渡さない場合は検索語だけが送信されること、送信ボタンが `type="submit"` であること、a11y 自動検査を確認します。

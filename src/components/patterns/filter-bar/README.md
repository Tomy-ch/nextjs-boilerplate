# FilterBar

## 用途

一覧の絞り込み操作と、いま効いている条件をまとめて表示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `FilterBar` | 絞り込み全体を `section` landmark として囲みます。 |
| `FilterBarControls` | 検索欄と条件を開く操作を並べる行です。 |
| `FilterBarTrigger` | 条件の入力欄を開く操作です。効いている条件の数を添えます。 |
| `FilterBarActiveFilters` | 効いている条件を並べる一覧です。 |
| `FilterChip` | 条件 1 件と、その解除操作です。 |
| `FilterBarSummary` | 絞り込んだ結果の件数と、条件をすべて解除する導線です。 |

## 利用ケース

検索欄は持たないので、[`search-field-native`](../../ui/search-field-native/README.md) か [`search-field-client`](../../ui/search-field-client/README.md) を `FilterBarControls` へ合成します。条件の入力欄の中身は画面ごとに異なるため、`Sheet` や `Popover` を呼び出し元が組み立て、`FilterBarTrigger` をその trigger として渡します。

## `SearchField*` との使い分け

排他ではなく、入れ子の関係です。`SearchFieldNative` / `SearchFieldClient` は**検索語 1 つの入力欄**を担い、`FilterBar` は**検索語を含む絞り込み全体の枠**を担います。検索欄そのものは持たないので、`FilterBarControls` の中へ合成します。

| 画面 | 使うもの |
| --- | --- |
| キーワードだけで絞り込む | `SearchField*` のみ |
| キーワードに加えて状態・期間などの条件がある | `FilterBar` + `SearchField*` |
| 条件はあるがキーワード検索は無い | `FilterBar` のみ |

どちらを合成するかは検索欄側の基準（JavaScript 無しで送信できる形が要るか、打鍵に追従するか）で決めます。`FilterBar` はどちらとも組み合わせられます。

なお `FilterChip` の解除手段は、合成した検索欄と揃えます。`SearchFieldNative` と組むなら条件は URL に載るので `removeHref`、`SearchFieldClient` と組んで client 側に条件を持つなら `onRemove` です。

## 解除の手段

`FilterChip` には `removeHref` か `onRemove` のどちらか一方を渡します。

- `removeHref`: URL に条件を載せる一覧で使います。条件を外した状態が履歴に残り、URL として共有できます。
- `onRemove`: client 側で条件を持つ一覧で使います。

どちらも渡さない場合、条件は表示だけになります。

## 支援技術への伝え方

`FilterBar` は `section` の landmark なので、絞り込みへ直接移動できます。同じ画面に絞り込みが複数ある場合は `label` で区別します。

条件が無くても `FilterBarActiveFilters` は要素を残します。条件を外し切ったときに一覧ごと消えると、何が起きたかが伝わらないためです。

件数は `aria-live="polite"` で伝えます。条件を変えた結果が一覧の見た目だけに現れると、画面を見ていない利用者には何件になったか分かりません。

解除操作の名前には条件名と値を含めます。「×」だけでは、複数並んだときに操作の一覧からどれを外すのか判別できません。

`onRemove` で条件を外すと、押した解除操作そのものが消えます。focus が document へ落ちないよう、外す直前に focus を条件の一覧へ移します。

## 責務境界

条件の解釈、URL の組み立て、絞り込みの実行、件数の計算は持ちません。呼び出し元が、表示する条件・解除先・件数を渡します。URL state の所有は feature 側です。

## Storybook とテスト

Storybook は URL に条件を載せる場合、条件が無い場合、overlay に入力欄を置く場合、client 側で条件を持つ場合を確認します。テストは landmark と一覧の名前、条件数の表示、件数と live region、解除手段の 3 通り、解除操作の名前、外したあとの focus の行き先、a11y 自動検査を確認します。

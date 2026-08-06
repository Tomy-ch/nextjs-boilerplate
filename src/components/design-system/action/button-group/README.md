# ButtonGroup

## 用途

同じ対象に対する複数の操作を、隣り合う角丸と境界を繋いだ一続きの帯としてまとめます。操作どうしが同じ対象へ向いていることを、間隔ではなく接続で示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ButtonGroup` | 帯そのもの。`orientation` で横並びと縦積みを切り替え、隣り合う子の角丸と境界を繋ぎます。`role="group"` を持つため `aria-label` を渡します。 |
| `ButtonGroupText` | 帯の中で、押せない短い語を操作と同じ高さで示します。`asChild` で `label` へ合成すると、隣の入力欄の名前になります。 |
| `ButtonGroupSeparator` | 帯の中の操作どうしを線で分けます。向きは帯と直交し、既定は装飾として読み上げ対象から外れます。 |
| `buttonGroupVariants` | `ButtonGroup` を render できない場所で並びの見た目だけを借りるための class 名生成器。 |

## 利用ケース

表示形式の切り替え、主操作とその別法を並べる split button、単位や項目名を伴う入力欄、書式操作の toolbar に使います。子は `Button` に限らず、`Input` や `SelectClient` の trigger も置けます。

## 責務境界

押した結果、どれが選ばれているか、排他制御は持ちません。**いずれか一つが選択されている状態を表すなら [`ToggleGroupNative`](../../form/toggle-group-native/README.md) / [`ToggleGroupClient`](../../form/toggle-group-client/README.md)**、単に間を空けて並べるだけなら `flex` と `gap-*` を使います。

子の大きさも繋ぎません。並べる `Button` の `size` は呼び出し元が揃えます。区切りの色は `bg-border` 固定で面の塗りを見ないため、面を塗る `default` variant の帯では対比する色を呼び出し元が渡します。

state も browser API も使わないため hydration は不要で、Server Component からそのまま render できます。client island になるのは、`SelectClient` のような子を置いたときのその子だけです。

## Storybook とテスト

Storybook（`Action/ButtonGroup`）は向き 2 種、語の挿入、split button、区切りの色、入れ子、選択部品との合成、大きさが揃っていない場合を確認します。テストは `role="group"` としての名前、`data-orientation`、語を button にしないこと、`asChild` での `label` 合成、区切りが読み上げ対象にならないこと、axe の自動検査を確認します。

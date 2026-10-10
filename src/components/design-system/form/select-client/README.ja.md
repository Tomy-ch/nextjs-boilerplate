> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# SelectClient

## 用途

native select では満たせない custom popup と keyboard / focus 操作を提供します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `SelectClient` | Radix を使って選択値と開閉状態を管理する client-side root です。 |
| `SelectTrigger` | 現在値を示し、候補 popup を開く操作要素です。 |
| `SelectValue` | 選択中の値、または placeholder を trigger 内に表示します。 |
| `SelectContent` | Portal に表示する候補 popup とそのスクロール領域です。デフォルトの `popper` は trigger 幅に揃え、必要な場合だけ `item-aligned` を選びます。 |
| `SelectGroup` | 関連する候補をまとめるグループです。 |
| `SelectLabel` | 候補グループの見出しです。 |
| `SelectItem` | 一つの選択肢です。選択中の印も表示します。 |
| `SelectSeparator` | 候補のまとまりを区切る装飾的な線です。 |
| `SelectScrollUpButton` | スクロール可能な候補一覧を上方向へ移動する操作要素です。 |
| `SelectScrollDownButton` | スクロール可能な候補一覧を下方向へ移動する操作要素です。 |

## 利用ケース

スクロールする候補一覧や custom popup が実際に必要な場面だけに使います。

## 責務境界

初期表示のデフォルトではありません。静的な少数候補は `SelectNative` を優先し、状態・検索・業務データは feature が管理します。

## Storybook とテスト

Storybook は可視ラベルを含む client island・disabled・invalid を、テストは初期値・disabled・a11y を確認します。

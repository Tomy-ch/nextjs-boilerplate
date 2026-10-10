> **このファイルは [`README.md`](README.md) の日本語訳です。**
> 直接編集しないでください。変更は英語の canonical な `README.md` を先に更新し、そのうえでこの日本語訳を同期してください。
> エージェントが読むのは `README.md` だけです。このファイルは人間が読むための翻訳です。

# RadioGroupClient

## 用途

native radio では満たせない custom interaction を client island として提供します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `RadioGroupClient` | Radix を使い、排他的選択の値と keyboard 操作を管理する client-side group です。 |
| `RadioGroupClientItem` | group 内の選択肢を表す操作要素です。選択中の表示を group の値と同期します。 |

## 利用ケース

独自の keyboard / focus 操作が実際に必要な場合だけに使います。

## 責務境界

初期表示のデフォルトではありません。静的な単一選択は `RadioGroupNative` を優先し、状態・業務データは feature が管理します。

## Storybook とテスト

Storybook は native 側と同じ項目・配置で client island と disabled を、テストは初期値と a11y を確認します。

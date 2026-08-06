# RadioGroupNative

## 用途

静的な候補から一つを選び、native form として送信します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `RadioGroupNative` | 関連する選択肢を `fieldset` としてまとめる、SSR first の group です。 |
| `RadioGroupNativeItem` | native `input[type="radio"]` を保持する選択肢です。同じ `name` を持つ項目から一つを送信できます。 |

## 利用ケース

並び順や表示形式など、同じ `name` を持つ排他的選択に使います。

## 責務境界

custom keyboard 操作や client state は持ちません。それらが必要な場合だけ `RadioGroupClient` を検討します。

## Storybook とテスト

Storybook は client 側と同じ項目・配置で通常と disabled を、テストは選択操作と a11y を確認します。

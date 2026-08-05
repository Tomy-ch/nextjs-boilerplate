# SelectNative

## 用途

静的で少数の候補から一つを選び、native form として送信します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `SelectNative` | native `select` を保持し、選択値を form として送信する SSR first の control です。 |
| `SelectNativeOption` | 一つの選択肢を表す native `option` です。 |
| `SelectNativeOptGroup` | 関連する選択肢をラベル付きでまとめる native `optgroup` です。 |

## 利用ケース

表示形式・並び順など、browser JavaScript を必要としない選択に使います。

## 責務境界

検索・custom popup・独自 keyboard 操作は持ちません。それらが必要な場合だけ `SelectClient` を検討します。

## Storybook とテスト

Storybook は通常・disabled・invalid を、テストは form 属性・a11y を確認します。

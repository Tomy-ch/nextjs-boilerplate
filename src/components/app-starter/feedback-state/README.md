# FeedbackState

## 用途

loading / empty / error / success の表示状態を一貫して伝えます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `FeedbackState` | `loading`、`empty`、`error`、`success` に対応する見出し・説明・補助操作を表示する view state component です。 |

## 利用ケース

画面全体または局所領域で、次に取れる行動を伴う状態表示が必要な場面に使います。

## 責務境界

状態判定・再試行・遷移・業務文言は feature が props として渡します。empty 専用部品を別に増やしません。

領域や画面全体の状態を扱う部品です。局所的な処理中表示は `Spinner`、最終コンテンツの形状が分かる待機は `Skeleton` を使い、この部品を入れ子にしません。`role="status"` / `alert` と `aria-live` を自身が持つため、状態を読み上げる責務はここに集約します。`loading` のアイコンは内部で `Spinner` を装飾として使っており、`prefers-reduced-motion` 時は回転を停止します。

## Storybook とテスト

Storybook は各状態と補助操作を、テストは状態ごとの表示と a11y を確認します。

# Calendar

## 用途

日付または日付範囲を選びます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Calendar` | 日付・日付範囲の選択、keyboard 操作、月移動を提供する client-side calendar です。 |
| `CalendarDayButton` | 一日を表す操作要素です。通常は `Calendar` が内部で利用し、表示を置き換える場合だけ指定します。 |

## 利用ケース

公開日などの日付、開始日・終了日の範囲を選ぶ場合に使います。日付だけを直接入力する場合は native の `input type="date"` を優先します。

## 責務境界

`react-day-picker` により hydration が必要な client island です。日時・タイムゾーンの変換、form 送信値、保存、利用可能な日の業務判断は持ちません。feature が選択結果を form や Server Action へ接続します。

## Storybook とテスト

Storybook は単一日付・日付範囲・選択不可の日付を、テストは grid の意味論・日付の選択操作・a11y を確認します。

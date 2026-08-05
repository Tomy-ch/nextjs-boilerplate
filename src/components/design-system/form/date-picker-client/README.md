# DatePickerClient

## 用途

カレンダー popup から単一の日付を選びます。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `DatePickerClient` | `Calendar` と `Popover` を合成し、選択値を hidden input と callback へ渡します。 |

### 値の形式とタイムゾーン

`Calendar` の選択操作では内部的に JavaScript の `Date` を使いますが、公開する値は `YYYY-MM-DD` の文字列です。`onValueChange` と hidden input の両方がこの形式になります。`Date` は返らないため、呼び出し側は日時型を直接受け取る前提にしないでください。

これは誕生日・公開日などの日付だけの値へ、ブラウザやサーバーのタイムゾーン変換を適用しないためです。時刻とタイムゾーンを含む瞬間を扱う場合は、呼び出し側で TZ を決めて日時へ変換するか、別の date-time component を使います。

## 利用ケース

公開日など、calendar 操作や popup が必要な単一日付の入力に使います。

## 責務境界

開閉と選択操作に hydration が必要な client island です。range・時刻・タイムゾーン変換・保存・検証は持ちません。単一日付を直接入力できる場合は `Input type="date"` を優先します。

## Storybook とテスト

Storybook は通常・初期値・disabled を、test は初期値、hidden form value、開閉、disabled、a11y を確認します。

# EditableTable

## 用途

`Input` などの native form control を table の cell に置き、Server Action または URL 送信で編集します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `EditableTable` | `Table` 全体を一つの native `form` として包みます。 |
| `EditableTableHeader` / `EditableTableBody` / `EditableTableFooter` | 見出し・編集行・集計行を置く table の領域です。 |
| `EditableTableRow` / `EditableTableHead` / `EditableTableCell` / `EditableTableCaption` | 行・列見出し・編集 cell・表の説明を構成します。 |

## 利用ケース

少数の設定値や管理対象を、table 形式のまま一括または行単位で編集する場合に使います。

## 責務境界

編集値、Server Action、field name、検証結果、保存単位、行の追加・削除は持ちません。feature が `Input`、`FieldError`、submit button とともに合成します。即時保存や複数行の下書き state は client island の責務です。

## Storybook とテスト

Storybook は通常編集、invalid 表示、単位と行内操作を `InputGroup` で値の枠内へ畳む cell、DataTable と同じ密度の inline 編集を分離します。test は form、table、control、エラーの意味論と a11y を確認します。

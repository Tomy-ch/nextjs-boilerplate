# Field

## 用途

label、入力、説明、エラーを一つの form field として構成します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Field` | 一つの入力項目をまとめる外枠です。 |
| `FieldGroup` / `FieldSet` | 関連する複数の field をまとめます。 |
| `FieldLabel` / `FieldLegend` | 項目名または選択群の名称を示します。 |
| `FieldContent` / `FieldDescription` / `FieldError` | control 周辺の内容・補足・エラーを置きます。 |
| `FieldTitle` | control を持たない項目の見出しを示します。入力欄の名称には `FieldLabel` を使います。 |
| `FieldSeparator` | field 群の視覚的な区切りを置きます。 |

## 利用ケース

native form の入力、選択、説明文、Server Action の検証結果を構成する場合に使います。

## 責務境界

Server Component であり、値の状態管理・検証・エラー配列の整形は行いません。feature が `aria-invalid`、`aria-describedby`、エラー文言を渡します。

## Storybook とテスト

Storybook は通常、invalid、区切りを別々に示し、test は label の関連付け・alert・a11y を確認します。

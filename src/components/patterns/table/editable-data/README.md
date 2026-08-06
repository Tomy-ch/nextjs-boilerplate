# EditableData Sugar

## 用途

編集 cell を含む列定義から、native form と table を一貫して組み立てます。

## 役割と公開 component

| Component / 型 | 役割 |
| --- | --- |
| `EditableDataTable` | 列定義から編集用 form table を組み立てます。 |
| `EditableDataTableColumn<Row>` | header・幅・alignment・row の編集 cell を定義します。 |

## 利用ケース

少数の設定値を table のまま編集する場合に使います。

## 責務境界

`EditableTable` は低レベルの form + table、ここは列定義の sugar です。保存、検証、下書き state は feature が所有します。

## Storybook とテスト

Storybook は通常編集・invalid・行単位保存・列定義が `InputGroup` を返す場合を、test は列幅・alignment・編集 control・a11y を確認します。

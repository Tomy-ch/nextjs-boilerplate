# Table Columns Sugar

## 用途

列定義を `colgroup` と column header へ展開し、幅と alignment の SSOT を提供します。

## 役割と公開 component

| Component / 型 | 役割 |
| --- | --- |
| `TableColumnGroup` | 列幅を `colgroup` に展開します。 |
| `TableColumnHeaders` | header と alignment を column header に展開します。 |
| `TableColumnDefinition` | static / editable sugar が共有する列設定です。 |
| `rowActionsColumn` | 行操作の定義から操作列を組み立てます。詳細は [`row-actions/README.md`](./row-actions/README.md) を参照します。 |

## 利用ケース

読み取り・編集の両 table で列の幅と配置を揃える場合に使います。行ごとの操作 menu は `row-actions` で組み立てます。

## 責務境界

行データ・cell の表示・保存・検証は持ちません。

## Storybook とテスト

StaticDataTable / EditableDataTable の Story と test を通じて展開結果を確認します。

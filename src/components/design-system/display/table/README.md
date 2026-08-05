# Table

## 用途

列と行の関係が利用者の理解に必要な、構造化データを表示します。単なる layout のために使わず、情報の
関係を表として読む場面に限定します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Table` | 横幅が不足した場合に横スクロールする wrapper を伴う native `table` です。 |
| `TableHeader` | 列見出しを置く `thead` 領域です。 |
| `TableBody` | 表の主なデータ行を置く `tbody` 領域です。 |
| `TableFooter` | 集計などの補足行を置く `tfoot` 領域です。 |
| `TableRow` | 一行を表す `tr` です。 |
| `TableHead` | 列または行の見出しを表す `th` です。 |
| `TableCell` | データを表す `td` です。 |
| `TableCaption` | 表の目的を説明する `caption` です。 |

## 利用ケース

一覧、履歴、明細、集計など、複数の属性を同じ列で比較する画面に使います。caption と column header を
置き、`TableHead` には `scope="col"` を指定します。

## 責務境界

取得・並べ替え・filter・pagination・行ごとの操作・業務型は持ちません。これらは feature が Table を
合成して実装します。横に広い内容は component の wrapper が横スクロールを扱います。

## Storybook とテスト

Storybook は基本表と集計 footer を別々に示します。テストは table / caption / column header の意味論と
a11y 自動検査を確認します。

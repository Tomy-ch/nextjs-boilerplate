# Pagination

## 用途

URL 遷移する一覧のページ移動を表します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `Pagination` | ページネーション全体を表す `nav`。アクセシブルな領域名もここで提供します。 |
| `PaginationContent` | ページネーション項目を横並びにするリストです。 |
| `PaginationItem` | ページ番号・前後移動・省略記号を包む個々のリスト項目です。 |
| `PaginationLink` | 任意のページへ遷移する link。`isActive` で現在ページを表します。 |
| `PaginationPrevious` | 前のページへ遷移する、ラベルとアイコン付きの link です。 |
| `PaginationNext` | 次のページへ遷移する、ラベルとアイコン付きの link です。 |
| `PaginationEllipsis` | 連続したページ番号を省略していることを示す、遷移しない表示要素です。 |

## 利用ケース

page 型の一覧で前後・現在・省略されたページへの link を示します。

## 責務境界

fetch、現在ページ計算、URL の組み立ては持ちません。feature が href と現在ページを渡します。

link は `next/link` で描画します。アプリ内の route 遷移のため、viewport に入った時点で移動先が prefetch され、遷移は client-side transition になります。ページ番号を多数並べる場合など prefetch を抑えたいときは、呼び出し元が `prefetch={false}` を渡します。

`href` は必須です。`?page=2` のようなクエリのみの相対 URL を渡すと、prefetch・遷移のいずれも現在の URL を基準に解決され、現在の pathname を保ったまま query だけが差し替わります。絞り込みや並び順を保って移動する場合は、呼び出し元が既存の query を含めた URL を組み立てます。

`PaginationPrevious` / `PaginationNext` の `href` は省略できます。先頭・末尾のように**行き先が無い端**では省略し、link ではなく操作できない control として描きます。要素ごと消さないのは、片側だけになったときに残った操作が左右へ動いて誤操作を招くためです。位置が保たれ、支援技術にも「あるが今は使えない」と伝わります。

表示内容は `children`、アクセシブルな名前は `aria-label` で差し替えられます。cursor 方式の前後移動はこの機構をそのまま使うため、[`CursorPagination`](../../navigation/cursor-pagination/README.md) は独自の前後移動を持ちません。

## Storybook とテスト

Storybook はページ番号の基本形、中間ページの前後移動、**先頭ページ**（前へが操作できない control）、**末尾ページ**（次へが操作できない control）、ページ数が多い場合の省略記号と前後移動を組み合わせた並びを確認します。

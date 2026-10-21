import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableRow,
} from "@/components/design-system/display/table/table";
import {
  type TableColumnDefinition,
  TableColumnGroup,
  TableColumnHeaders,
  tableColumnCellClass,
} from "../columns";

/** 読み取り専用 row を表示する列の定義。 */
export type StaticDataTableColumn<Row> = TableColumnDefinition & {
  cell: (row: Row) => ReactNode;
  cellClassName?: string;
};

/** {@link StaticDataTable} の props。 */
export type StaticDataTableProps<Row> = {
  /** 表の説明。渡すと `caption` として描画する。 */
  caption?: ReactNode;
  /** 外枠の class。 */
  className?: string;
  /** 列の定義。並び順がそのまま列の順序になる。 */
  columns: readonly StaticDataTableColumn<Row>[];
  /**
   * 行が 1 件も無いときに出す文言。
   *
   * @defaultValue "表示する項目はありません。"
   */
  emptyMessage?: ReactNode;
  /** 行を識別する key を返す。 */
  getRowKey: (row: Row) => string;
  /** 横スクロールする領域の名前。 */
  label?: string;
  /** 表の下に置く頁送り。 */
  pagination?: ReactNode;
  /**
   * 各行に追加する class 名。
   *
   * @remarks
   * 行そのものを押せるようにする場合など、cell の中の要素を行いっぱいへ広げるには、行の側が
   * 位置指定の基準になっている必要がある。何を基準にするかは並べる側の都合なので、ここで受ける。
   */
  rowClassName?: string;
  /** 描画する行。 */
  rows: readonly Row[];
  /** 表の上に置く操作。 */
  toolbar?: ReactNode;
};

/**
 * 読み取り専用の列定義を、table・empty 表示・toolbar・pagination へ展開する sugar。
 *
 * @typeParam Row - 1 行が表す値の型。
 * @param props - 列の定義と描画する行、行が無いときの文言、および表の周りへ置く要素。
 *
 * @see Storybook `Sugar/Table/StaticData`
 */
export function StaticDataTable<Row>({
  caption,
  className,
  columns,
  emptyMessage = "表示する項目はありません。",
  getRowKey,
  label,
  pagination,
  rowClassName,
  rows,
  toolbar,
}: StaticDataTableProps<Row>) {
  return (
    <div className={cn("space-y-4", className)} data-slot="data-table">
      {toolbar ? <div data-slot="data-table-toolbar">{toolbar}</div> : null}
      <Table label={label}>
        <TableColumnGroup columns={columns} />
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableColumnHeaders columns={columns} />
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="h-24 text-center text-muted-foreground"
                colSpan={columns.length}
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow className={rowClassName} key={getRowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    className={cn(tableColumnCellClass(column), column.cellClassName)}
                    key={column.id}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination ? <div data-slot="data-table-pagination">{pagination}</div> : null}
    </div>
  );
}

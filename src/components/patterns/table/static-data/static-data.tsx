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
  caption?: ReactNode;
  className?: string;
  columns: readonly StaticDataTableColumn<Row>[];
  emptyMessage?: ReactNode;
  getRowKey: (row: Row) => string;
  /** 横スクロールする領域の名前。 */
  label?: string;
  pagination?: ReactNode;
  rows: readonly Row[];
  toolbar?: ReactNode;
};

/**
 * 読み取り専用の列定義を、table・empty 表示・toolbar・pagination へ展開する sugar。
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
              <TableRow key={getRowKey(row)}>
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

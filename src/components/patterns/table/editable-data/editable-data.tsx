import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import {
  EditableTable,
  EditableTableBody,
  EditableTableCaption,
  EditableTableCell,
  type EditableTableProps,
  EditableTableRow,
} from "@/components/design-system/form/editable-table/editable-table";
import {
  type TableColumnDefinition,
  TableColumnGroup,
  TableColumnHeaders,
  tableColumnCellClass,
} from "../columns";

/** 編集 row を表示する列の定義。 */
export type EditableDataTableColumn<Row> = TableColumnDefinition & {
  cell: (row: Row) => ReactNode;
  cellClassName?: string;
};
/** {@link EditableDataTable} の props。 */
export type EditableDataTableProps<Row> = Omit<EditableTableProps, "children"> & {
  /** 表の説明。渡すと `caption` として描画する。 */
  caption?: ReactNode;
  /** 列の定義。並び順がそのまま列の順序になる。 */
  columns: readonly EditableDataTableColumn<Row>[];
  /** 行を識別する key を返す。 */
  getRowKey: (row: Row) => string;
  /** 描画する行。 */
  rows: readonly Row[];
};

/**
 * 編集 cell を含む列定義を、native form と table へ展開する sugar。
 *
 * @typeParam Row - 1 行が表す値の型。
 * @param props - 列の定義と描画する行、および行を識別する key の取り方。
 *
 * @see Storybook `Sugar/Table/EditableData`
 */
export function EditableDataTable<Row>({
  caption,
  columns,
  getRowKey,
  rows,
  ...props
}: EditableDataTableProps<Row>) {
  return (
    <EditableTable {...props}>
      <TableColumnGroup columns={columns} />
      {caption ? <EditableTableCaption>{caption}</EditableTableCaption> : null}
      <TableColumnHeaders columns={columns} />
      <EditableTableBody>
        {rows.map((row) => (
          <EditableTableRow key={getRowKey(row)}>
            {columns.map((column) => (
              <EditableTableCell
                className={cn(tableColumnCellClass(column), column.cellClassName)}
                key={column.id}
              >
                {column.cell(row)}
              </EditableTableCell>
            ))}
          </EditableTableRow>
        ))}
      </EditableTableBody>
    </EditableTable>
  );
}

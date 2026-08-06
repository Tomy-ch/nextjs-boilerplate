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
  caption?: ReactNode;
  columns: readonly EditableDataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  rows: readonly Row[];
};

/**
 * 編集 cell を含む列定義を、native form と table へ展開する sugar。
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

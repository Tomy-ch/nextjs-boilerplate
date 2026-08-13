import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/components/cn";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../../display/table/table";

/**
 * {@link EditableTable} の props。
 *
 * @remarks
 * `action` / `method` など送信に関わる属性は native `form` のものがそのまま使える。
 */
export type EditableTableProps = ComponentProps<"form"> & {
  /** table の中身。`EditableTableHeader` / `EditableTableBody` などを組み合わせて渡す。 */
  children: ReactNode;
  /** 横スクロールする領域の名前。 */
  label?: string;
  /** 内側の `table` 要素へ渡す class 名。外側の `form` には `className` が適用される。 */
  tableClassName?: string;
};

/**
 * table の cell を入力欄にして、行をまとめて送信する form。
 *
 * @remarks
 * `form` が `table` を包む構造を作るだけの Server Component である。値の保持、検証、保存単位、
 * 行の追加・削除は持たないため、feature が Server Action と `name` 設計を与える。
 *
 * 少数の値を直接編集する用途に使う。読み取り専用の一覧には `Table`、列定義から組み立てる場合は
 * `sugar/table/editable-data` の `EditableDataTable` を使う。
 *
 * @example
 * ```tsx
 * <EditableTable action={saveRows}>
 *   <EditableTableHeader>
 *     <EditableTableRow>
 *       <EditableTableHead>名称</EditableTableHead>
 *     </EditableTableRow>
 *   </EditableTableHeader>
 *   <EditableTableBody>
 *     {rows.map((row) => (
 *       <EditableTableRow key={row.id}>
 *         <EditableTableCell>
 *           <Input defaultValue={row.name} name={`name.${row.id}`} />
 *         </EditableTableCell>
 *       </EditableTableRow>
 *     ))}
 *   </EditableTableBody>
 * </EditableTable>
 * ```
 *
 * @param props - native `form` 属性と、以下の表示用 props。
 * @param props.children - table の中身。
 * @param props.label - 横スクロールする領域の名前。
 * @param props.tableClassName - 内側の `table` 要素へ渡す class 名。
 * @see Storybook `Form/EditableTable`
 */
export function EditableTable({
  children,
  className,
  label,
  tableClassName,
  ...props
}: EditableTableProps) {
  return (
    <form className={cn("w-full", className)} data-slot="editable-table" {...props}>
      <Table className={tableClassName} label={label}>
        {children}
      </Table>
    </form>
  );
}

/**
 * 見出し行をまとめる `thead`。実体は `Table` の `TableHeader`。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableHeader = TableHeader;
/**
 * 編集対象の行をまとめる `tbody`。実体は `Table` の `TableBody`。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableBody = TableBody;
/**
 * 合計や送信ボタンを置く `tfoot`。実体は `Table` の `TableFooter`。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableFooter = TableFooter;
/**
 * 一行を表す `tr`。実体は `Table` の `TableRow`。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableRow = TableRow;
/**
 * 列見出しの `th`。実体は `Table` の `TableHead`。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableHead = TableHead;
/**
 * 入力欄を置く `td`。実体は `Table` の `TableCell`。
 *
 * @remarks
 * 中へ `Input` などの control を置き、行を識別できる `name` を呼び出し元が与える。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableCell = TableCell;
/**
 * table 全体の説明を与える `caption`。実体は `Table` の `TableCaption`。
 *
 * @see Storybook `Form/EditableTable`
 */
export const EditableTableCaption = TableCaption;

import type { CSSProperties, ReactNode } from "react";

import { TableHead, TableHeader, TableRow } from "@/components/design-system/display/table/table";

/** 列内の文字揃え。 */
export type TableColumnAlignment = "center" | "end" | "start";

/** static / editable の table sugar が共有する列設定。 */
export type TableColumnDefinition = {
  align?: TableColumnAlignment;
  header: ReactNode;
  headerClassName?: string;
  id: string;
  width?: CSSProperties["width"];
};

const ALIGNMENT_CLASS: Readonly<Record<TableColumnAlignment, string>> = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
};

/**
 * 列定義から `colgroup` を組み立て、各列の幅を table 全体へ適用する。
 *
 * @remarks
 * {@link TableColumnHeaders} と同じ列定義を渡すことで、幅と見出しの対応が崩れないようにする。
 * 単体で使う場面は少なく、通常は `StaticDataTable` / `EditableDataTable` が内部で組み立てる。
 *
 * @param props.columns - 列の定義。`width` を持つ列だけが `col` へ幅として出る。
 * @see Storybook `Sugar/Table/StaticData`
 */
export function TableColumnGroup({ columns }: { columns: readonly TableColumnDefinition[] }) {
  return (
    <colgroup>
      {columns.map((column) => (
        <col key={column.id} style={{ width: column.width }} />
      ))}
    </colgroup>
  );
}

/**
 * 列定義から見出し行の `th` を並べる。
 *
 * @remarks
 * 見出しの文字寄せは列の `alignment` に従う。並べ替えの操作や状態は持たないため、
 * sort を提供する場合は呼び出し元が見出しの中へ control を置く。
 *
 * @param props.columns - 列の定義。配列の順序がそのまま列の順序になる。
 * @see Storybook `Sugar/Table/StaticData`
 */
export function TableColumnHeaders({ columns }: { columns: readonly TableColumnDefinition[] }) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead
            className={`${ALIGNMENT_CLASS[column.align ?? "start"]} ${column.headerClassName ?? ""}`}
            key={column.id}
            scope="col"
          >
            {column.header}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/** 列定義の alignment に対応する cell 用 class を返す。 */
export function tableColumnCellClass(column: TableColumnDefinition): string {
  return ALIGNMENT_CLASS[column.align ?? "start"];
}

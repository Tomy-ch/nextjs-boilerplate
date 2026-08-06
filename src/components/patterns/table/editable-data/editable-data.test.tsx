// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Input } from "@/components/design-system/form/input/input";
import { EditableDataTable, type EditableDataTableColumn } from "./editable-data";

type Row = { id: string; state: string };
const columns: readonly EditableDataTableColumn<Row>[] = [
  {
    id: "state",
    header: "状態",
    width: "50%",
    align: "end",
    cell: (row) => <Input aria-label="状態" defaultValue={row.state} name={`state-${row.id}`} />,
  },
];
const getRowKey = (row: Row) => row.id;

describe("EditableDataTable", () => {
  it("列定義を colgroup、header、編集 cell へ適用する", () => {
    const { container } = render(
      <EditableDataTable
        action="/"
        caption="設定"
        columns={columns}
        getRowKey={getRowKey}
        rows={[{ id: "one", state: "有効" }]}
      />,
    );
    expect(container.querySelector("col")).toHaveStyle({ width: "50%" });
    expect(screen.getByRole("columnheader", { name: "状態" })).toHaveClass("text-right");
    expect(screen.getByRole("textbox", { name: "状態" })).toHaveAttribute("name", "state-one");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <EditableDataTable columns={columns} getRowKey={getRowKey} rows={[]} />,
    );
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

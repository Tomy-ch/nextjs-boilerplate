// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { StaticDataTable, type StaticDataTableColumn } from "./static-data";

type Row = { id: string; name: string };
const columns: readonly StaticDataTableColumn<Row>[] = [
  { id: "name", header: "項目", width: "50%", cell: (row) => row.name },
];
const getRowKey = (row: Row) => row.id;
describe("StaticDataTable", () => {
  it("列定義を table として表示する", () => {
    const { container } = render(
      <StaticDataTable
        caption="状態一覧"
        columns={columns}
        getRowKey={getRowKey}
        rows={[{ id: "one", name: "概要" }]}
      />,
    );
    expect(container.querySelector("col")).toHaveStyle({ width: "50%" });
    expect(screen.getByRole("table")).toHaveAccessibleName("状態一覧");
    expect(screen.getByRole("cell", { name: "概要" })).toBeInTheDocument();
  });
  it("空表示、toolbar、pagination を表示する", () => {
    render(
      <StaticDataTable
        columns={columns}
        getRowKey={getRowKey}
        pagination={<nav aria-label="ページ移動" />}
        rows={[]}
        toolbar={
          <form aria-label="項目を検索">
            <input aria-label="項目を検索" />
          </form>
        }
      />,
    );
    expect(screen.getByText("表示する項目はありません。")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "項目を検索" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "ページ移動" })).toBeInTheDocument();
  });
  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <StaticDataTable columns={columns} getRowKey={getRowKey} rows={[]} />,
    );
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

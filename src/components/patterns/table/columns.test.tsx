// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Table } from "@/components/design-system/display/table/table";

import {
  type TableColumnDefinition,
  TableColumnGroup,
  TableColumnHeaders,
  tableColumnCellClass,
} from "./columns";

const COLUMNS: TableColumnDefinition[] = [
  { id: "name", header: "名称", width: "12rem" },
  { id: "count", header: "件数", align: "end" },
  { id: "note", header: "備考", headerClassName: "sr-only" },
];

describe("TableColumnGroup", () => {
  it("列の数だけ col を並べ、幅を持つ列へ幅を書く", () => {
    const { container } = render(
      <Table>
        <TableColumnGroup columns={COLUMNS} />
      </Table>,
    );

    const cols = container.querySelectorAll("col");

    expect(cols).toHaveLength(COLUMNS.length);
    expect(cols[0]).toHaveStyle({ width: "12rem" });
  });

  it("列が無ければ col を並べない", () => {
    const { container } = render(
      <Table>
        <TableColumnGroup columns={[]} />
      </Table>,
    );

    expect(container.querySelectorAll("col")).toHaveLength(0);
  });
});

describe("TableColumnHeaders", () => {
  it("列定義の順に見出しセルを並べる", () => {
    render(
      <Table>
        <TableColumnHeaders columns={COLUMNS} />
      </Table>,
    );

    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "名称",
      "件数",
      "備考",
    ]);
  });

  it("列の寄せと呼び出し側の class を見出しへ反映する", () => {
    render(
      <Table>
        <TableColumnHeaders columns={COLUMNS} />
      </Table>,
    );

    expect(screen.getByRole("columnheader", { name: "件数" })).toHaveClass("text-right");
    expect(screen.getByRole("columnheader", { name: "備考" })).toHaveClass("sr-only");
  });

  it("並べた見出しは a11y 違反を持たない", async () => {
    const { container } = render(
      <Table>
        <TableColumnHeaders columns={COLUMNS} />
      </Table>,
    );

    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("tableColumnCellClass", () => {
  it("列の寄せに対応する class を返す", () => {
    expect(tableColumnCellClass({ id: "a", header: "a", align: "center" })).toBe("text-center");
    expect(tableColumnCellClass({ id: "a", header: "a", align: "end" })).toBe("text-right");
  });

  it("寄せの指定が無ければ左寄せを返す", () => {
    expect(tableColumnCellClass({ id: "a", header: "a" })).toBe("text-left");
  });
});

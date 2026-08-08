// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../../display/table/table";
import { Input } from "../input/input";
import {
  EditableTable,
  EditableTableBody,
  EditableTableCaption,
  EditableTableCell,
  EditableTableFooter,
  EditableTableHead,
  EditableTableHeader,
  EditableTableRow,
} from "./editable-table";

function Example() {
  return (
    <EditableTable action="/">
      <EditableTableCaption>設定</EditableTableCaption>
      <EditableTableHeader>
        <EditableTableRow>
          <EditableTableHead scope="col">項目</EditableTableHead>
          <EditableTableHead scope="col">値</EditableTableHead>
        </EditableTableRow>
      </EditableTableHeader>
      <EditableTableBody>
        <EditableTableRow>
          <EditableTableCell>表示名</EditableTableCell>
          <EditableTableCell>
            <Input aria-label="表示名" name="displayName" />
          </EditableTableCell>
        </EditableTableRow>
      </EditableTableBody>
    </EditableTable>
  );
}

describe("EditableTable", () => {
  it("form 内に編集用 table と control を表示する", () => {
    const { container } = render(<Example />);
    expect(container.querySelector("form")).toHaveAttribute("action", "/");
    expect(screen.getByRole("table")).toHaveAccessibleName("設定");
    expect(screen.getByRole("textbox", { name: "表示名" })).toHaveAttribute("name", "displayName");
  });
  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Example />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("EditableTableHeader", () => {
  // ----- 正常系 -----
  it("表の見出し行の束をそのまま提供する", () => {
    const { container } = render(<Example />);

    expect(EditableTableHeader).toBe(TableHeader);
    expect(container.querySelector("thead")).toHaveAttribute("data-slot", "table-header");
  });
});

describe("EditableTableBody", () => {
  // ----- 正常系 -----
  it("表の本体行の束をそのまま提供する", () => {
    const { container } = render(<Example />);

    expect(EditableTableBody).toBe(TableBody);
    expect(container.querySelector("tbody")).toHaveAttribute("data-slot", "table-body");
  });
});

describe("EditableTableFooter", () => {
  // ----- 正常系 -----
  it("表の脚注行の束をそのまま提供する", () => {
    const { container } = render(
      <EditableTable action="/">
        <EditableTableFooter>
          <EditableTableRow>
            <EditableTableCell>合計</EditableTableCell>
          </EditableTableRow>
        </EditableTableFooter>
      </EditableTable>,
    );

    expect(EditableTableFooter).toBe(TableFooter);
    expect(container.querySelector("tfoot")).toHaveAttribute("data-slot", "table-footer");
  });
});

describe("EditableTableRow", () => {
  // ----- 正常系 -----
  it("表の行をそのまま提供する", () => {
    render(<Example />);

    expect(EditableTableRow).toBe(TableRow);
    expect(screen.getAllByRole("row")[0]).toHaveAttribute("data-slot", "table-row");
  });
});

describe("EditableTableHead", () => {
  // ----- 正常系 -----
  it("表の見出しセルをそのまま提供する", () => {
    render(<Example />);

    expect(EditableTableHead).toBe(TableHead);
    expect(screen.getByRole("columnheader", { name: "項目" })).toHaveAttribute(
      "data-slot",
      "table-head",
    );
  });
});

describe("EditableTableCell", () => {
  // ----- 正常系 -----
  it("表のデータセルをそのまま提供する", () => {
    render(<Example />);

    expect(EditableTableCell).toBe(TableCell);
    expect(screen.getByRole("cell", { name: "表示名" })).toHaveAttribute("data-slot", "table-cell");
  });
});

describe("EditableTableCaption", () => {
  // ----- 正常系 -----
  it("表の説明をそのまま提供する", () => {
    const { container } = render(<Example />);

    expect(EditableTableCaption).toBe(TableCaption);
    expect(container.querySelector("caption")).toHaveAttribute("data-slot", "table-caption");
  });
});

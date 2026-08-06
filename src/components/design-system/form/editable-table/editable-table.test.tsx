// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Input } from "../input/input";
import {
  EditableTable,
  EditableTableBody,
  EditableTableCaption,
  EditableTableCell,
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

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

function Fixture() {
  return (
    <Table>
      <TableCaption>最近の更新</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">項目</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>概要</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>合計</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

describe("Table", () => {
  it("caption と column header を持つ表を表示する", () => {
    render(<Fixture />);
    expect(screen.getByRole("table", { name: "最近の更新" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "項目" })).toHaveAttribute("scope", "col");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

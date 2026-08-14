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

describe("TableHeader", () => {
  it("見出し行の束として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">項目</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(container.querySelector("thead")).toHaveAttribute("data-slot", "table-header");
  });
});

describe("TableBody", () => {
  it("本体行の束として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>値</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(container.querySelector("tbody")).toHaveAttribute("data-slot", "table-body");
  });
});

describe("TableFooter", () => {
  it("脚注行の束として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Table>
        <TableFooter>
          <TableRow>
            <TableCell>合計</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(container.querySelector("tfoot")).toHaveAttribute("data-slot", "table-footer");
  });
});

describe("TableRow", () => {
  it("行として slot を持つ要素を描画する", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>値</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("row")).toHaveAttribute("data-slot", "table-row");
  });
});

describe("TableHead", () => {
  it("見出しセルとして slot を持つ要素を描画する", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">項目</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    const head = screen.getByRole("columnheader", { name: "項目" });

    expect(head).toHaveAttribute("data-slot", "table-head");
    expect(head).toHaveAttribute("scope", "col");
  });
});

describe("TableCell", () => {
  it("データセルとして slot を持つ要素を描画する", () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>値</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("cell", { name: "値" })).toHaveAttribute("data-slot", "table-cell");
  });
});

describe("TableCaption", () => {
  it("表の説明として slot を持つ要素を描画する", () => {
    const { container } = render(
      <Table>
        <TableCaption>最近の更新</TableCaption>
      </Table>,
    );

    expect(container.querySelector("caption")).toHaveAttribute("data-slot", "table-caption");
  });
});

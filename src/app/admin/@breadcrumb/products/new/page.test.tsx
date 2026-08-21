// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminProductNewBreadcrumb from "./page";

describe("AdminProductNewBreadcrumb", () => {
  it("作る画面の階層を出す", () => {
    render(<AdminProductNewBreadcrumb />);

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toBeInTheDocument();
    expect(screen.getByText("新規作成")).toBeInTheDocument();
  });
});

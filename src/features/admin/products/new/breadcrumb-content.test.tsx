// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminProductCreateBreadcrumbContent } from "./breadcrumb-content";

describe("AdminProductCreateBreadcrumbContent", () => {
  // ----- 正常系 -----
  it("一覧の下に、作る画面に居ることを出す", () => {
    render(<AdminProductCreateBreadcrumbContent />);

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toBeInTheDocument();
    expect(screen.getByText("新規作成")).toBeInTheDocument();
  });
});

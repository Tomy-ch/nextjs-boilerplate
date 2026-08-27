// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminProductCreateBreadcrumbContent } from "./breadcrumb-content";

describe("AdminProductCreateBreadcrumbContent", () => {
  it("一覧の下に、作る画面に居ることを出す", () => {
    render(<AdminProductCreateBreadcrumbContent />);

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toBeInTheDocument();
    expect(screen.getByText("新規作成")).toBeInTheDocument();
  });
  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AdminProductCreateBreadcrumbContent />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProductBreadcrumbTrail } from "./breadcrumb-trail";

describe("ProductBreadcrumbTrail", () => {
  // ----- 正常系 -----
  it("一覧へ戻る先頭の段を、どの階層でも出す", () => {
    render(<ProductBreadcrumbTrail trail={["新規作成"]} />);

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
  });

  it("渡された順に、一覧より下の階層を並べる", () => {
    render(<ProductBreadcrumbTrail trail={["ワイヤレスイヤホン", "編集"]} />);

    expect(screen.getByText("ワイヤレスイヤホン")).toBeInTheDocument();
    expect(screen.getByText("編集")).toBeInTheDocument();
  });

  it("一覧より下は戻り先を持たない", () => {
    render(<ProductBreadcrumbTrail trail={["ワイヤレスイヤホン", "編集"]} />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("下の階層が無ければ、一覧だけを出す", () => {
    render(<ProductBreadcrumbTrail trail={[]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<ProductBreadcrumbTrail trail={["新規作成"]} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

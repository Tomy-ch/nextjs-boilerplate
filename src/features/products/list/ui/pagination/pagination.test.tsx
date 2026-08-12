// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductPagination } from "./pagination";

describe("ProductPagination", () => {
  // ----- 正常系 -----
  it("次ページのカーソルをリンクに載せる", () => {
    render(<ProductPagination nextCursor="cursor-1" searchParams={{}} />);

    expect(screen.getByRole("link", { name: "次の商品を見る" })).toHaveAttribute(
      "href",
      "/products?after=cursor-1",
    );
  });

  it("現在の検索条件を次ページへ引き継ぐ", () => {
    render(<ProductPagination nextCursor="cursor-1" searchParams={{ keyword: "靴" }} />);

    expect(screen.getByRole("link", { name: "次の商品を見る" }).getAttribute("href")).toContain(
      "keyword=%E9%9D%B4",
    );
  });

  it("前のページのカーソルを引き継がない", () => {
    render(<ProductPagination nextCursor="cursor-2" searchParams={{ after: "cursor-1" }} />);

    expect(screen.getByRole("link", { name: "次の商品を見る" })).toHaveAttribute(
      "href",
      "/products?after=cursor-2",
    );
  });

  it("同じキーが複数あれば先頭を引き継ぐ", () => {
    render(<ProductPagination nextCursor="cursor-1" searchParams={{ keyword: ["靴", "鞄"] }} />);

    expect(screen.getByRole("link", { name: "次の商品を見る" }).getAttribute("href")).toContain(
      "keyword=%E9%9D%B4",
    );
  });
  // ----- 異常系 -----
  it("次ページが無ければ何も出さない", () => {
    const { container } = render(<ProductPagination nextCursor={null} searchParams={{}} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("空の条件を引き継がない", () => {
    render(<ProductPagination nextCursor="cursor-1" searchParams={{ keyword: "" }} />);

    expect(screen.getByRole("link", { name: "次の商品を見る" })).toHaveAttribute(
      "href",
      "/products?after=cursor-1",
    );
  });

  it("値の無い条件を引き継がない", () => {
    render(<ProductPagination nextCursor="cursor-1" searchParams={{ keyword: undefined }} />);

    expect(screen.getByRole("link", { name: "次の商品を見る" })).toHaveAttribute(
      "href",
      "/products?after=cursor-1",
    );
  });
});

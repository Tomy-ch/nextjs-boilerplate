// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

function Fixture() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="?page=1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="?page=2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="?page=3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe("Pagination", () => {
  it("現在ページを aria-current で表す navigation を表示する", () => {
    render(<Fixture />);
    expect(screen.getByRole("navigation", { name: "ページネーション" })).toBeVisible();
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute("href", "?page=1");
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute("href", "?page=3");
  });

  it("省略記号の代替テキストを支援技術へ残す", () => {
    const { container } = render(<PaginationEllipsis />);
    const ellipsis = container.querySelector("[data-slot='pagination-ellipsis']");

    // 記号だけを隠す。外側に aria-hidden を付けると子孫ごと外れ、代替テキストも読まれない。
    expect(ellipsis).not.toHaveAttribute("aria-hidden");
    expect(ellipsis?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("省略されたページ")).toHaveClass("sr-only");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("行き先が無い端では link ではなく操作できない control になる", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="?page=2" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.queryByRole("link", { name: "前のページ" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute("href", "?page=2");
  });

  it("行き先が無くても要素は残り、位置が動かない", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("children と aria-label で前後の表示と名前を差し替えられる", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious aria-label="前の結果" href="?page=1">
              前の結果
            </PaginationPrevious>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    expect(screen.getByRole("link", { name: "前の結果" })).toHaveTextContent("前の結果");
  });
});

describe("PaginationContent", () => {
  // ----- 正常系 -----
  it("ページ操作を並べるリストとして slot を持つ要素を描画する", () => {
    render(<PaginationContent />);

    expect(screen.getByRole("list")).toHaveAttribute("data-slot", "pagination-content");
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    render(<PaginationContent className="gap-4" />);

    expect(screen.getByRole("list")).toHaveClass("gap-4");
  });
});

describe("PaginationItem", () => {
  // ----- 正常系 -----
  it("操作 1 件を listitem として描画する", () => {
    render(
      <PaginationContent>
        <PaginationItem>1</PaginationItem>
      </PaginationContent>,
    );

    expect(screen.getByRole("listitem")).toHaveAttribute("data-slot", "pagination-item");
  });
});

describe("PaginationLink", () => {
  // ----- 正常系 -----
  it("遷移先を持つ link として描画する", () => {
    render(<PaginationLink href="?page=2">2</PaginationLink>);

    const link = screen.getByRole("link", { name: "2" });

    expect(link).toHaveAttribute("href", "?page=2");
    expect(link).toHaveAttribute("data-slot", "pagination-link");
  });

  it("現在地の指定を aria-current で伝える", () => {
    render(
      <PaginationLink href="?page=2" isActive>
        2
      </PaginationLink>,
    );

    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
  });
});

describe("PaginationPrevious", () => {
  // ----- 正常系 -----
  it("遷移先があれば「前のページ」という名前の link にする", () => {
    render(<PaginationPrevious href="?page=1" />);

    expect(screen.getByRole("link", { name: "前のページ" })).toHaveAttribute("href", "?page=1");
  });

  // ----- 異常系 -----
  it("遷移先が無ければ押せない操作にする", () => {
    render(<PaginationPrevious />);

    expect(screen.getByRole("button", { name: "前のページ" })).toBeDisabled();
  });
});

describe("PaginationNext", () => {
  // ----- 正常系 -----
  it("遷移先があれば「次のページ」という名前の link にする", () => {
    render(<PaginationNext href="?page=3" />);

    expect(screen.getByRole("link", { name: "次のページ" })).toHaveAttribute("href", "?page=3");
  });

  // ----- 異常系 -----
  it("遷移先が無ければ押せない操作にする", () => {
    render(<PaginationNext />);

    expect(screen.getByRole("button", { name: "次のページ" })).toBeDisabled();
  });
});

describe("PaginationEllipsis", () => {
  // ----- 正常系 -----
  it("記号を隠し、省略の説明だけを読み上げさせる", () => {
    const { container } = render(<PaginationEllipsis />);
    const ellipsis = container.querySelector('[data-slot="pagination-ellipsis"]');

    expect(ellipsis).not.toBeNull();
    expect(screen.getByText("省略されたページ")).toBeInTheDocument();
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    const { container } = render(<PaginationEllipsis className="px-2" />);

    expect(container.querySelector('[data-slot="pagination-ellipsis"]')).toHaveClass("px-2");
  });
});

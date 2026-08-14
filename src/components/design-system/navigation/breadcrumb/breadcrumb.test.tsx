// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

function BreadcrumbFixture() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">ホーム</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/categories">カテゴリ</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>デスク周り</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("名前を持つ navigation landmark として提供する", () => {
    render(<BreadcrumbFixture />);

    expect(screen.getByRole("navigation", { name: "パンくずリスト" })).toHaveAttribute(
      "data-slot",
      "breadcrumb",
    );
  });

  it("階層を順序付きリストとして並べる", () => {
    render(<BreadcrumbFixture />);

    const list = screen.getByRole("list");

    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("上位階層を遷移先つきの link として表示する", () => {
    render(<BreadcrumbFixture />);

    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "カテゴリ" })).toHaveAttribute("href", "/categories");
  });

  it("現在地は遷移先を持たず、現在のページであることを伝える", () => {
    render(<BreadcrumbFixture />);

    const current = screen.getByText("デスク周り");

    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveAttribute("data-slot", "breadcrumb-page");
    expect(current).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: "デスク周り" })).not.toBeInTheDocument();
  });

  it("区切りは装飾として読み上げ対象から外す", () => {
    const { container } = render(<BreadcrumbFixture />);

    const separators = container.querySelectorAll("[data-slot='breadcrumb-separator']");

    expect(separators).toHaveLength(2);
    for (const separator of separators) {
      expect(separator).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("区切り記号を children で差し替えられる", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">ホーム</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage>カテゴリ</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(container.querySelector("[data-slot='breadcrumb-separator']")).toHaveTextContent("/");
  });

  it("省略記号は読み上げ用の文言を保持しつつ装飾として扱う", () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const ellipsis = container.querySelector("[data-slot='breadcrumb-ellipsis']");

    // 記号だけを隠す。外側に aria-hidden を付けると子孫ごと外れ、代替テキストも読まれない。
    expect(ellipsis).not.toHaveAttribute("aria-hidden");
    expect(ellipsis?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(within(container).getByText("省略された階層")).toHaveClass("sr-only");
  });

  it("asChild で next/link などの link component へ合成できる", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">ホーム</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute(
      "data-slot",
      "breadcrumb-link",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<BreadcrumbFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("BreadcrumbList", () => {
  it("経路を並べるリストとして slot を持つ要素を描画する", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>ホーム</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    expect(screen.getByRole("list")).toHaveAttribute("data-slot", "breadcrumb-list");
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    render(<BreadcrumbList className="mt-2" />);

    expect(screen.getByRole("list")).toHaveClass("mt-2");
  });
});

describe("BreadcrumbItem", () => {
  it("経路 1 件として slot を持つ要素を描画する", () => {
    render(<BreadcrumbItem>ホーム</BreadcrumbItem>);

    expect(screen.getByText("ホーム")).toHaveAttribute("data-slot", "breadcrumb-item");
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    render(<BreadcrumbItem className="gap-4">ホーム</BreadcrumbItem>);

    expect(screen.getByText("ホーム")).toHaveClass("gap-4");
  });
});

describe("BreadcrumbLink", () => {
  it("遷移先を持つ link として描画する", () => {
    render(<BreadcrumbLink href="/">ホーム</BreadcrumbLink>);

    const link = screen.getByRole("link", { name: "ホーム" });

    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
  });

  it("asChild で渡した要素を link の実体にする", () => {
    render(
      <BreadcrumbLink asChild>
        <Link href="/categories">カテゴリ</Link>
      </BreadcrumbLink>,
    );

    expect(screen.getByRole("link", { name: "カテゴリ" })).toHaveAttribute("href", "/categories");
  });
});

describe("BreadcrumbPage", () => {
  it("現在地を link ではない要素として示す", () => {
    render(<BreadcrumbPage>デスク周り</BreadcrumbPage>);

    const page = screen.getByText("デスク周り");

    expect(page).toHaveAttribute("data-slot", "breadcrumb-page");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    render(<BreadcrumbPage className="font-bold">デスク周り</BreadcrumbPage>);

    expect(screen.getByText("デスク周り")).toHaveClass("font-bold");
  });
});

describe("BreadcrumbSeparator", () => {
  it("区切りを支援技術から隠して描画する", () => {
    const { container } = render(<BreadcrumbSeparator />);
    const separator = container.querySelector('[data-slot="breadcrumb-separator"]');

    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute("aria-hidden", "true");
  });

  it("渡した子要素で既定の区切り記号を差し替える", () => {
    render(<BreadcrumbSeparator>/</BreadcrumbSeparator>);

    expect(screen.getByText("/")).toBeInTheDocument();
  });
});

describe("BreadcrumbEllipsis", () => {
  it("省略を支援技術へ伝わる名前付きで示す", () => {
    const { container } = render(<BreadcrumbEllipsis />);
    const ellipsis = container.querySelector('[data-slot="breadcrumb-ellipsis"]');

    expect(ellipsis).not.toBeNull();
    expect(ellipsis).toHaveTextContent("省略された階層");
  });

  it("呼び出し側の class を既定の指定へ足す", () => {
    const { container } = render(<BreadcrumbEllipsis className="px-2" />);

    expect(container.querySelector('[data-slot="breadcrumb-ellipsis"]')).toHaveClass("px-2");
  });
});

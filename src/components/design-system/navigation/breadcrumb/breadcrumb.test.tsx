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

    expect(ellipsis).toHaveAttribute("aria-hidden", "true");
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

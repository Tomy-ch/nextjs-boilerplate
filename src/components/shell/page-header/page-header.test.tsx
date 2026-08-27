// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ContentContainer } from "../content-container/content-container";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "./page-header";

function Fixture() {
  return (
    <main>
      <ContentContainer>
        <PageHeader>
          <PageHeaderTitle>メンバー一覧</PageHeaderTitle>
          <PageHeaderDescription>参加中のメンバーを確認します。</PageHeaderDescription>
          <PageHeaderActions>
            <button type="button">メンバーを追加</button>
          </PageHeaderActions>
        </PageHeader>
      </ContentContainer>
    </main>
  );
}

describe("PageHeader", () => {
  it("ページの名前を見出し階層の起点として提供する", () => {
    render(<Fixture />);

    expect(screen.getByRole("heading", { level: 1, name: "メンバー一覧" })).toBeInTheDocument();
  });

  it("先頭ブロックを header 要素として置く", () => {
    render(<Fixture />);

    expect(document.querySelector("[data-slot='page-header']")?.tagName).toBe("HEADER");
  });

  it("説明と操作を省いても成立する", () => {
    render(
      <PageHeader>
        <PageHeaderTitle>設定</PageHeaderTitle>
      </PageHeader>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "設定" })).toBeInTheDocument();
    expect(document.querySelector("[data-slot='page-header-description']")).toBeNull();
    expect(document.querySelector("[data-slot='page-header-actions']")).toBeNull();
  });

  it("左右余白を持たず、余白の所有を ContentContainer へ残す", () => {
    render(<Fixture />);

    const header = document.querySelector("[data-slot='page-header']");

    expect(header?.className).not.toMatch(/(^|\s|:)px-/);
    expect(header?.className).not.toMatch(/(^|\s|:)p-/);
  });

  it("呼び出し元の className を受け付ける", () => {
    render(
      <PageHeader className="border-b">
        <PageHeaderTitle>設定</PageHeaderTitle>
      </PageHeader>,
    );

    expect(document.querySelector("[data-slot='page-header']")).toHaveClass("border-b");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

describe("PageHeaderTitle", () => {
  it("題名として slot を持つ要素を描画する", () => {
    render(<Fixture />);

    expect(screen.getByText("メンバー一覧")).toHaveAttribute("data-slot", "page-header-title");
  });
});

describe("PageHeaderDescription", () => {
  it("補足として slot を持つ要素を描画する", () => {
    render(<Fixture />);

    expect(screen.getByText("参加中のメンバーを確認します。")).toHaveAttribute(
      "data-slot",
      "page-header-description",
    );
  });
});

describe("PageHeaderActions", () => {
  it("操作の枠として slot を持つ要素を描画する", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelector('[data-slot="page-header-actions"]')).not.toBeNull();
  });
});

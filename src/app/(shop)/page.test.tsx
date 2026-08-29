// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { HomePageContent } = vi.hoisted(() => ({ HomePageContent: vi.fn() }));

vi.mock("@/features/home/page-content", () => ({ HomePageContent }));

import HomePage, { metadata } from "./page";

/** 取得が終わらない中身。待機中の見え方を固定するために使う。 */
function pending() {
  HomePageContent.mockImplementation(() => new Promise(() => undefined));
}

describe("HomePage", () => {
  it("この画面の名前と説明を metadata に持つ", () => {
    expect(metadata.title).toBe("トップ");
    expect(metadata.description).toBe("新着商品と売れ筋ランキング、カテゴリから商品を探せます。");
  });

  it("取得を待つ間も断り書きと見出しを出す", () => {
    pending();
    render(<HomePage />);

    expect(screen.getByText("サンプルサイトです")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "ようこそ" })).toBeVisible();
  });

  it("断り書きを中身より前に置く", () => {
    pending();
    const { container } = render(<HomePage />);

    const notice = screen.getByRole("alert");
    const heading = screen.getByRole("heading", { level: 1, name: "ようこそ" });

    // 断り書きの後ろに見出しが来る。逆順なら読み始めた後に断り書きが現れる。
    expect(notice.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(container.textContent?.indexOf("サンプルサイトです")).toBeLessThan(
      container.textContent?.indexOf("ようこそ") ?? -1,
    );
  });

  it("中身が揃うまで待機表示を出す", () => {
    pending();
    const { container } = render(<HomePage />);

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<HomePage />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

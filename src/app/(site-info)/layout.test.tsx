// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
  useRouter: () => ({ refresh: () => {} }),
}));

import { GLOBAL_NAV_ITEMS } from "../global-nav";
import SiteInfoLayout from "./layout";

function renderLayout(children = <p>本文</p>) {
  return render(<SiteInfoLayout>{children}</SiteInfoLayout>);
}

describe("SiteInfoLayout", () => {
  it("外枠へ子要素を入れる", () => {
    renderLayout(<p>テスト用コンテンツ</p>);

    expect(within(screen.getByRole("main")).getByText("テスト用コンテンツ")).toBeVisible();
  });

  it("利用者向けと同じ導線を並べる", () => {
    renderLayout();

    const nav = within(screen.getByRole("navigation", { name: "主要な導線" }));

    for (const { href, label } of GLOBAL_NAV_ITEMS) {
      expect(nav.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("カートの入口を出さない", () => {
    renderLayout();

    expect(screen.queryByRole("button", { name: /カートを/ })).not.toBeInTheDocument();
  });

  it("管理への入口を出さない", () => {
    renderLayout();

    expect(screen.queryByRole("link", { name: "管理" })).not.toBeInTheDocument();
  });

  it("本文の脇に何も置かない", () => {
    renderLayout();

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("リポジトリへの導線を footer に持つ", () => {
    renderLayout();

    expect(
      within(screen.getByRole("contentinfo")).getByRole("navigation", { name: "リポジトリ" }),
    ).toBeVisible();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = renderLayout();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

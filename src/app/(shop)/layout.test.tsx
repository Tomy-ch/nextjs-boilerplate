// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: () => {} }),
}));

// 穴の中身は取得を待つ Server Component で、client の描画器では解決できない。器が確かめるのは
// **どの穴へ何を差したか**なので、中身は目印へ差し替える。中身そのものの検証は隣の
// `admin-nav-entry.test.tsx` と `features/cart/ui/shell-slots` が持つ。
vi.mock("./admin-nav-entry", () => ({
  AdminNavEntry: ({ replace }: { replace?: boolean }) => (
    <span>{replace === true ? "管理（menu）" : "管理（header）"}</span>
  ),
}));
vi.mock("@/features/cart/ui/shell-slots/shell-slots", () => ({
  CartHeaderSlot: () => <span>カートの入口</span>,
  CartPanelSlot: () => <aside aria-label="カート">カートの中身</aside>,
}));

import ShopLayout from "./layout";

function renderLayout(children = <p>本文</p>) {
  return render(<ShopLayout>{children}</ShopLayout>);
}

describe("ShopLayout", () => {
  it("利用者向けの外枠へ子要素を入れる", () => {
    renderLayout(<p>テスト用コンテンツ</p>);

    expect(within(screen.getByRole("main")).getByText("テスト用コンテンツ")).toBeVisible();
  });

  it("主体を知らずに決まる導線は器が直接並べる", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: "商品" })).toHaveAttribute("href", "/products");
  });

  it("主体で決まる導線を header の穴へ差す", () => {
    renderLayout();

    expect(within(screen.getByRole("banner")).getByText("管理（header）")).toBeVisible();
  });

  it("side menu の穴には履歴を積まない指定で差す", async () => {
    const user = userEvent.setup();

    renderLayout();
    await user.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(await screen.findByText("管理（menu）")).toBeVisible();
  });

  it("カートの入口を header の穴へ差す", () => {
    renderLayout();

    expect(within(screen.getByRole("banner")).getByText("カートの入口")).toBeVisible();
  });

  it("カートの中身を本文の脇の穴へ差す", () => {
    renderLayout();

    expect(screen.getByRole("complementary", { name: "カート" })).toBeVisible();
  });

  it("a11y 違反を持たない", async () => {
    const { container } = renderLayout(<p>テスト用コンテンツ</p>);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AppShellMenu } from "./app-shell-menu";

const ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/orders", label: "注文" },
];

describe("AppShellMenu", () => {
  // ----- 正常系 -----
  it("開く操作だけを最初に見せる", () => {
    render(<AppShellMenu items={ITEMS} />);

    expect(screen.getByRole("button", { name: "メニューを開く" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "メニュー" })).toBeNull();
  });

  it("開くと渡した導線を並べる", () => {
    render(<AppShellMenu items={ITEMS} />);

    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("link", { name: "商品" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "注文" })).toHaveAttribute("href", "/orders");
  });

  it("導線を選ぶと閉じる", () => {
    render(<AppShellMenu items={ITEMS} />);
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    fireEvent.click(screen.getByRole("link", { name: "商品" }));

    expect(screen.queryByRole("link", { name: "商品" })).toBeNull();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AppShellMenu items={ITEMS} />);
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  // ----- 異常系 -----
  it("導線が無くてもメニューを開ける", () => {
    render(<AppShellMenu items={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("navigation", { name: "メニュー" })).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AppShellMenu } from "./app-shell-menu";

const ITEMS = [
  { href: "/reports", label: "レポート" },
  { href: "/settings", label: "設定" },
];

describe("AppShellMenu", () => {
  it("開く操作だけを最初に見せる", () => {
    render(<AppShellMenu items={ITEMS} />);

    expect(screen.getByRole("button", { name: "メニューを開く" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "メニュー" })).toBeNull();
  });

  it("開くと渡した導線を並べる", () => {
    render(<AppShellMenu items={ITEMS} />);

    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("link", { name: "レポート" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute("href", "/settings");
  });

  it("導線を選ぶと閉じる", () => {
    render(<AppShellMenu items={ITEMS} />);
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    fireEvent.click(screen.getByRole("link", { name: "レポート" }));

    expect(screen.queryByRole("link", { name: "レポート" })).toBeNull();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AppShellMenu items={ITEMS} />);
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("導線が無くてもメニューを開ける", () => {
    render(<AppShellMenu items={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("navigation", { name: "メニュー" })).toBeInTheDocument();
  });
});

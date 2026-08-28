// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/") }));

vi.mock("next/navigation", () => ({ usePathname }));

import { AppShellMenu, AppShellMenuFallback } from "./app-shell-menu";

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

  it("開くと渡した導線を並べる", async () => {
    render(<AppShellMenu items={ITEMS} />);

    await userEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("link", { name: "レポート" })).toHaveAttribute("href", "/reports");
    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute("href", "/settings");
  });

  it("移った先で閉じる", async () => {
    usePathname.mockReturnValue("/");

    const { rerender } = render(<AppShellMenu items={ITEMS} />);
    await userEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    usePathname.mockReturnValue("/reports");
    rerender(<AppShellMenu items={ITEMS} />);

    expect(screen.queryByRole("link", { name: "レポート" })).toBeNull();
  });

  it("押した時点では閉じない", async () => {
    usePathname.mockReturnValue("/");

    render(<AppShellMenu items={ITEMS} />);
    await userEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    await userEvent.click(screen.getByRole("link", { name: "レポート" }));

    expect(screen.getByRole("link", { name: "レポート" })).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AppShellMenu items={ITEMS} />);
    await userEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("導線が無くてもメニューを開ける", async () => {
    render(<AppShellMenu items={[]} />);

    await userEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("navigation", { name: "メニュー" })).toBeInTheDocument();
  });
});

describe("AppShellMenuFallback", () => {
  it("menu と同じ大きさの枠を、押せない状態で出す", () => {
    const { unmount } = render(<AppShellMenuFallback />);
    const fallbackClass = screen.getByRole("button", { name: "メニューを開く" }).className;

    expect(screen.getByRole("button", { name: "メニューを開く" })).toBeDisabled();

    unmount();
    render(<AppShellMenu items={ITEMS} />);

    expect(screen.getByRole("button", { name: "メニューを開く" })).toHaveClass(fallbackClass);
  });

  it("a11y 違反を持たない", async () => {
    const { container } = render(<AppShellMenuFallback />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

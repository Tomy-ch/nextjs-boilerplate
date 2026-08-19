// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/admin/reports") }));

vi.mock("next/navigation", () => ({ usePathname }));

import type { AdminShellNavGroup } from "./admin-shell.definition";
import { AdminShellMenu } from "./admin-shell-menu";

const GROUPS: readonly AdminShellNavGroup[] = [
  { label: "レポート", items: [{ href: "/admin/reports", label: "レポート一覧" }] },
];

function renderMenu() {
  return render(<AdminShellMenu groups={GROUPS} />);
}

function trigger(): HTMLElement {
  return screen.getByRole("button", { name: "メニューを開く" });
}

describe("AdminShellMenu", () => {
  // ----- 閉じているとき -----
  it("開く操作だけを出す", () => {
    renderMenu();

    expect(screen.queryByRole("link", { name: "レポート一覧" })).not.toBeInTheDocument();
  });

  it("記号だけの操作に読める名前を与える", () => {
    renderMenu();

    expect(trigger()).toHaveAccessibleName("メニューを開く");
  });

  // ----- 開いたとき -----
  it("脇に常設する一覧と同じ導線を出す", async () => {
    renderMenu();

    await userEvent.click(trigger());

    expect(await screen.findByRole("link", { name: "レポート一覧" })).toBeInTheDocument();
  });

  it("何の overlay かを見出しで示す", async () => {
    renderMenu();

    await userEvent.click(trigger());

    expect(await screen.findByRole("dialog", { name: "メニュー" })).toBeInTheDocument();
  });

  // ----- 移った先 -----
  it("移った先で閉じる", async () => {
    const { rerender } = renderMenu();

    await userEvent.click(trigger());
    await screen.findByRole("dialog");

    usePathname.mockReturnValue("/admin/users");
    rerender(<AdminShellMenu groups={GROUPS} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderMenu();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });

  it("overlay を開いたときの a11y 検査を通る", async () => {
    const { container } = renderMenu();

    await userEvent.click(trigger());
    await screen.findByRole("dialog");

    expect(
      (await axe(container.ownerDocument.body, { rules: { "color-contrast": { enabled: false } } }))
        .violations,
    ).toEqual([]);
  });
});

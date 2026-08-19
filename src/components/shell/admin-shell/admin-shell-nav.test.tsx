// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => "/admin/products") }));

vi.mock("next/navigation", () => ({ usePathname }));

import type { AdminShellNavGroup } from "./admin-shell.definition";
import { AdminShellNav } from "./admin-shell-nav";

const GROUPS: readonly AdminShellNavGroup[] = [
  {
    label: "商品",
    items: [
      { href: "/admin/products", label: "商品一覧管理" },
      { href: "/admin/products/new", label: "商品を作成" },
    ],
  },
  { label: "利用者", items: [{ href: "/admin/users", label: "利用者一覧" }] },
];

function renderNav() {
  return render(<AdminShellNav groups={GROUPS} label="管理メニュー" />);
}

describe("AdminShellNav", () => {
  it("何の導線かを名前で示す", () => {
    renderNav();

    expect(screen.getByRole("navigation", { name: "管理メニュー" })).toBeInTheDocument();
  });

  it("まとまりごとに導線を並べる", () => {
    renderNav();

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("いま開いている画面に印を付ける", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "商品一覧管理" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("同じ接頭辞を持つだけの導線には印を付けない", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "商品を作成" })).not.toHaveAttribute("aria-current");
  });

  it("どの導線とも一致しない場所では印が付かない", () => {
    usePathname.mockReturnValueOnce("/admin/products/1/edit");
    renderNav();

    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("まとまりの見出しは遷移させない", () => {
    renderNav();

    expect(screen.queryByRole("link", { name: "商品" })).not.toBeInTheDocument();
  });

  it("既定ではまとまりが開いている", () => {
    renderNav();

    expect(screen.getByText("商品").closest("details")).toHaveAttribute("open");
  });

  it("見出しを押すとまとまりが畳まれる", async () => {
    renderNav();
    const group = screen.getByText("商品").closest("details");

    await userEvent.click(screen.getByText("商品"));

    expect(group).not.toHaveAttribute("open");
  });

  it("外側の余白を class 名で受け取る", () => {
    render(<AdminShellNav className="p-3" groups={GROUPS} label="管理メニュー" />);

    expect(screen.getByRole("navigation", { name: "管理メニュー" })).toHaveClass("p-3");
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderNav();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

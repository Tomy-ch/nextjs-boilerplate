// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/reports" }));

import { AdminShell } from "./admin-shell";
import { ADMIN_SHELL_MAIN_ID, type AdminShellNavGroup } from "./admin-shell.definition";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "レポート", items: [{ href: "/admin/reports", label: "レポート一覧" }] },
];

function renderShell(props: Partial<Parameters<typeof AdminShell>[0]> = {}) {
  return render(
    <AdminShell
      consoleName="管理"
      homeHref="/admin/reports"
      navGroups={NAV_GROUPS}
      siteHref="/"
      siteName="サイト"
      {...props}
    >
      <p>本文</p>
    </AdminShell>,
  );
}

describe("AdminShell", () => {
  it("本文を main へ入れる", () => {
    renderShell();

    expect(screen.getByRole("main")).toHaveTextContent("本文");
  });

  it("skip link の飛び先を main に合わせる", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "本文へスキップ" })).toHaveAttribute(
      "href",
      `#${ADMIN_SHELL_MAIN_ID}`,
    );
  });

  it("サイト名と管理側の名称で別の場所を指す", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "サイト" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "管理" })).toHaveAttribute("href", "/admin/reports");
  });

  it("脇の一覧へ渡された導線を並べる", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "レポート一覧" })).toBeInTheDocument();
  });

  it("header の右へ渡された要素を出す", () => {
    renderShell({ headerActions: <button type="button">ユーザー画面へ</button> });

    expect(screen.getByRole("button", { name: "ユーザー画面へ" })).toBeInTheDocument();
  });

  it("脇の一覧の下端へ渡された要素を出す", () => {
    renderShell({ navFooter: <p>ログイン中</p> });

    expect(screen.getByText("ログイン中")).toBeInTheDocument();
  });

  it("下端へ何も渡さなければその区画を作らない", () => {
    renderShell();

    expect(screen.queryByText("ログイン中")).not.toBeInTheDocument();
  });

  it("本文の先頭へ渡された階層を出す", () => {
    renderShell({ breadcrumb: <p>商品一覧 &gt; 新規作成</p> });

    expect(screen.getByText("商品一覧 > 新規作成")).toBeInTheDocument();
  });

  it("階層へ何も渡さなければその区画を作らない", () => {
    renderShell();

    expect(screen.queryByText("商品一覧 > 新規作成")).not.toBeInTheDocument();
  });

  it("main へ class 名を渡せる", () => {
    renderShell({ className: "py-8" });

    expect(screen.getByRole("main")).toHaveClass("py-8");
  });

  // ----- 脇の一覧の開閉 -----
  it("既定では開いた状態で描く", () => {
    const { container } = renderShell();

    expect(container.firstElementChild).toHaveAttribute("data-nav-open", "true");
  });

  it("畳む操作で外枠の状態が変わる", async () => {
    const { container } = renderShell();

    await userEvent.click(screen.getByRole("button", { name: "メニューの開閉" }));

    expect(container.firstElementChild).toHaveAttribute("data-nav-open", "false");
  });

  it("畳んでも導線は器から消えない", async () => {
    renderShell();

    await userEvent.click(screen.getByRole("button", { name: "メニューの開閉" }));

    expect(screen.getByRole("link", { name: "レポート一覧" })).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderShell();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

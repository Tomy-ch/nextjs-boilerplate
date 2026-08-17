// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}));

import { AppShell } from "./app-shell";
import { APP_SHELL_HEADER_HEIGHT, APP_SHELL_MAIN_ID } from "./app-shell.definition";

const NAV_ITEMS = [
  { href: "/reports", label: "レポート" },
  { href: "/settings", label: "設定" },
];

function renderShell() {
  return render(
    <AppShell siteName="サイト" navItems={NAV_ITEMS} footer={<p>フッター</p>}>
      <p>本文</p>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("本文を main へ入れる", () => {
    renderShell();

    expect(screen.getByRole("main")).toHaveTextContent("本文");
  });

  it("skip link の飛び先を main に合わせる", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "本文へスキップ" })).toHaveAttribute(
      "href",
      `#${APP_SHELL_MAIN_ID}`,
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", APP_SHELL_MAIN_ID);
  });

  it("導線を header に並べる", () => {
    renderShell();

    expect(screen.getByRole("navigation", { name: "主要な導線" })).toHaveTextContent("レポート");
  });

  it("footer の内容を出す", () => {
    renderShell();

    expect(screen.getByRole("contentinfo")).toHaveTextContent("フッター");
  });

  it("狭い画面の導線を side menu で開ける", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("設定");
  });

  it("side menu の導線を選んだら閉じる", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));

    const [link] = within(screen.getByRole("dialog")).getAllByRole("link");

    fireEvent.click(link);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("main は読み幅を持たない", () => {
    renderShell();

    expect(screen.getByRole("main").className).not.toContain("max-w-");
  });

  it("header の導線の後ろに渡された要素を並べる", () => {
    render(
      <AppShell headerActions={<p>お知らせ</p>} navItems={NAV_ITEMS} siteName="サイト">
        <p>本文</p>
      </AppShell>,
    );

    expect(within(screen.getByRole("banner")).getByText("お知らせ")).toBeVisible();
  });

  it("main の脇に渡された領域を並べる", () => {
    render(
      <AppShell navItems={NAV_ITEMS} siteName="サイト" sidebar={<aside aria-label="補助情報" />}>
        <p>本文</p>
      </AppShell>,
    );

    expect(screen.getByRole("complementary", { name: "補助情報" })).toBeInTheDocument();
  });

  it("脇の領域を渡さなければ本文だけを置く", () => {
    renderShell();

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderShell();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
  it("導線が無くても骨格を保つ", () => {
    render(
      <AppShell siteName="サイト" navItems={[]}>
        <p>本文</p>
      </AppShell>,
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主要な導線" })).toBeEmptyDOMElement();
  });

  it("header を、下へ貼り付ける側が参照する高さのとおりに描く", () => {
    renderShell();

    expect(screen.getByRole("banner")).toHaveStyle({ height: `${APP_SHELL_HEADER_HEIGHT}px` });
  });
});

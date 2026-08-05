// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import Link from "next/link";
import { beforeAll, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

beforeAll(() => {
  // Radix の navigation menu は位置計算に使う API を jsdom が持たないため、実装を変えずに補う。
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function NavigationFixture({ viewport = true }: { viewport?: boolean }) {
  return (
    <NavigationMenu viewport={viewport}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/">ホーム</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>カテゴリ</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul>
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/categories/desk">デスク周り</Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("navigation landmark とリストとして遷移先を並べる", () => {
    render(<NavigationFixture />);

    const nav = screen.getByRole("navigation");

    expect(nav).toHaveAttribute("data-slot", "navigation-menu");
    expect(within(nav).getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/");
  });

  it("下位階層は開くまで表示しない", () => {
    render(<NavigationFixture />);

    expect(screen.getByRole("button", { name: /カテゴリ/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: "デスク周り" })).not.toBeInTheDocument();
  });

  it("trigger の操作で下位階層を開く", () => {
    render(<NavigationFixture />);

    const trigger = screen.getByRole("button", { name: /カテゴリ/ });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "デスク周り" })).toHaveAttribute(
      "href",
      "/categories/desk",
    );
  });

  it("viewport を使わない場合も下位階層を開ける", () => {
    render(<NavigationFixture viewport={false} />);

    const trigger = screen.getByRole("button", { name: /カテゴリ/ });
    fireEvent.click(trigger);

    expect(screen.getByRole("link", { name: "デスク周り" })).toBeInTheDocument();
  });

  it("active な link は現在のページであることを伝える", () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink active asChild className={navigationMenuTriggerStyle()}>
              <Link href="/activity">アクティビティ</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByRole("link", { name: "アクティビティ" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("navigationMenuTriggerStyle は trigger と同じ見た目の class を返す", () => {
    render(<NavigationFixture />);

    const link = screen.getByRole("link", { name: "ホーム" });
    const trigger = screen.getByRole("button", { name: /カテゴリ/ });

    expect(link.className).toContain("h-9");
    expect(trigger.className).toContain("h-9");
  });

  it("indicator を足しても navigation の意味論は変わらない", () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>カテゴリ</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink asChild>
                <Link href="/categories/desk">デスク周り</Link>
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator />
      </NavigationMenu>,
    );

    const trigger = screen.getByRole("button", { name: /カテゴリ/ });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "デスク周り" })).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { baseElement } = render(<NavigationFixture />);

    const result = await axe(baseElement, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });

    expect(result.violations).toEqual([]);
  });
});

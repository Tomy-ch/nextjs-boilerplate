// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ABOUT_PATH, PRIVACY_PATH } from "@/features/site-info/facade/paths/paths";

import { MypageActionRow } from "./action-row";

describe("MypageActionRow", () => {
  it("サイトの説明への導線を出す", () => {
    render(<MypageActionRow />);

    expect(screen.getByRole("link", { name: "このサイトについて" })).toHaveAttribute(
      "href",
      ABOUT_PATH,
    );
  });

  it("プライバシーポリシーへの導線を出す", () => {
    render(<MypageActionRow />);

    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toHaveAttribute(
      "href",
      PRIVACY_PATH,
    );
  });

  it("退会を隠さず同じ並びに出す", () => {
    render(<MypageActionRow />);

    expect(screen.getByRole("button", { name: "退会する" })).toBeVisible();
  });

  it("読むための内容と混ざらないよう名前つきの領域にまとめる", () => {
    render(<MypageActionRow />);

    expect(
      screen.getByRole("navigation", { name: "このサイトについての案内と退会" }),
    ).toBeVisible();
  });

  it("横に並べられる幅では 3 つを同じ幅の段に収める", () => {
    render(<MypageActionRow />);

    expect(screen.getByRole("navigation", { name: "このサイトについての案内と退会" })).toHaveClass(
      "sm:grid-cols-3",
    );
  });

  it("縦に積む幅では区切り線で 1 つずつに分ける", () => {
    render(<MypageActionRow />);

    expect(screen.getByRole("navigation", { name: "このサイトについての案内と退会" })).toHaveClass(
      "divide-y",
      "sm:divide-y-0",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MypageActionRow />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

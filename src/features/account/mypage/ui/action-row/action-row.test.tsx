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

  it("3 つの操作をそれぞれ独立して辿れるようにする", () => {
    render(<MypageActionRow />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "退会する" })).toBeEnabled();
  });

  // jsdom は media query を評価しないので、ここで固定できるのは class の付与までである。
  // 実際にその幅でどう見えるかは VRT が持つ。
  it("幅で並べ方を切り替える class を持つ", () => {
    render(<MypageActionRow />);

    expect(screen.getByRole("navigation", { name: "このサイトについての案内と退会" })).toHaveClass(
      "sm:grid-cols-3",
      "divide-y",
      "sm:divide-y-0",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MypageActionRow />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

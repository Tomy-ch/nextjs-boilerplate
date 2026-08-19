// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Badge } from "./badge";
import { BADGE_VARIANT } from "./badge.definition";

describe("Badge", () => {
  it("既定と各 variant のラベルを表示する", () => {
    render(
      <>
        <Badge>公開中</Badge>
        <Badge variant={BADGE_VARIANT.SECONDARY}>準備中</Badge>
        <Badge variant={BADGE_VARIANT.SUCCESS}>完了</Badge>
        <Badge variant={BADGE_VARIANT.DESTRUCTIVE}>利用停止</Badge>
        <Badge variant={BADGE_VARIANT.WARNING}>入荷待ち</Badge>
        <Badge variant={BADGE_VARIANT.OUTLINE}>カテゴリ</Badge>
        <Badge variant={BADGE_VARIANT.GHOST}>補足</Badge>
      </>,
    );

    expect(screen.getByText("公開中")).toHaveAttribute("data-slot", "badge");
    expect(screen.getByText("準備中")).toHaveAttribute("data-variant", BADGE_VARIANT.SECONDARY);
    expect(screen.getByText("完了")).toHaveAttribute("data-variant", BADGE_VARIANT.SUCCESS);
    expect(screen.getByText("利用停止")).toHaveAttribute("data-variant", BADGE_VARIANT.DESTRUCTIVE);
    expect(screen.getByText("入荷待ち")).toHaveAttribute("data-variant", BADGE_VARIANT.WARNING);
    expect(screen.getByText("カテゴリ")).toHaveAttribute("data-variant", BADGE_VARIANT.OUTLINE);
    expect(screen.getByText("補足")).toHaveAttribute("data-variant", BADGE_VARIANT.GHOST);
  });

  it("asChild で anchor へ badge の表現を付与する", () => {
    render(
      <Badge asChild variant={BADGE_VARIANT.LINK}>
        <Link href="/items?category=food">食品</Link>
      </Badge>,
    );

    expect(screen.getByRole("link", { name: "食品" })).toHaveAttribute(
      "href",
      "/items?category=food",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Badge>新着</Badge>);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

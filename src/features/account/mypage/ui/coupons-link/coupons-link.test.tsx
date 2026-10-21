// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { COUPONS_PATH } from "@/features/coupons/facade/paths/paths";

import { MypageCouponsLink } from "./coupons-link";

describe("MypageCouponsLink", () => {
  it("保有クーポンの画面を指すリンクとして出す", () => {
    render(<MypageCouponsLink />);

    expect(screen.getByRole("link", { name: /クーポン/ })).toHaveAttribute("href", COUPONS_PATH);
  });

  it("リンクの名前で、確かめられることと受け取れることを伝える", () => {
    render(<MypageCouponsLink />);

    expect(
      screen.getByRole("link", {
        name: /受け取ったクーポンの確認と、キャンペーンコードでの受け取り/,
      }),
    ).toBeVisible();
  });

  it("一覧の 1 行として置く", () => {
    render(<MypageCouponsLink />);

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<MypageCouponsLink />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

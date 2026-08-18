// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { PROFILE } from "../../../checkout.fixture";
import { ShippingCard } from "./shipping-card";

describe("ShippingCard", () => {
  it("届け先として使う登録情報を出す", () => {
    render(<ShippingCard profile={PROFILE} />);

    expect(screen.getByText("山田 太郎")).toBeVisible();
    expect(
      screen.getByText(/〒150-0001 東京都 渋谷区 神宮前 1-2-3 サンプルマンション 101/),
    ).toBeVisible();
    expect(screen.getByText("09012345678")).toBeVisible();
  });

  it("変更は登録情報の側へ送る", () => {
    render(<ShippingCard profile={PROFILE} />);

    expect(screen.getByRole("link", { name: "変更する" })).toHaveAttribute("href", "/mypage/edit");
  });

  it("入力欄を持たない", () => {
    render(<ShippingCard profile={PROFILE} />);

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
  it("建物名が無ければ、その区切りごと落とす", () => {
    render(<ShippingCard profile={{ ...PROFILE, building: null }} />);

    expect(screen.getByText("〒150-0001 東京都 渋谷区 神宮前 1-2-3")).toBeVisible();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ShippingCard profile={PROFILE} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

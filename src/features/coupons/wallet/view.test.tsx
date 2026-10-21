// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ToastProvider } from "@/components/shell/toaster/toaster";
import { MYPAGE_PATH } from "@/features/account/facade/paths/paths";
import type { HeldCoupon } from "@/model/coupon/coupon";

vi.mock("../actions", () => ({ claimCouponAction: vi.fn() }));

import { FIXTURE_NOW, HELD_COUPONS, UNUSED_COUPON } from "../coupons.fixture";
import { WalletView } from "./view";

function renderView(coupons: readonly HeldCoupon[] = HELD_COUPONS, now: Date = FIXTURE_NOW) {
  return render(
    <ToastProvider>
      <WalletView coupons={coupons} now={now} />
    </ToastProvider>,
  );
}

describe("WalletView", () => {
  // ----- 揃っているとき -----
  it("パンくずでマイページへ戻れ、いまの画面を現在地として示す", () => {
    renderView();

    expect(screen.getByRole("link", { name: "マイページ" })).toHaveAttribute("href", MYPAGE_PATH);
    expect(screen.getByText("クーポン", { selector: '[aria-current="page"]' })).toBeVisible();
  });

  it("受け取り欄を一覧より前に置く", () => {
    renderView();

    const field = screen.getByLabelText("キャンペーンコード");
    const firstRow = screen.getAllByRole("listitem")[0];

    if (firstRow === undefined) {
      throw new Error("一覧の行がありません。");
    }

    expect(field.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("渡された時刻で一覧の状態を決める", () => {
    renderView([UNUSED_COUPON], UNUSED_COUPON.expiresAt);

    expect(screen.getByRole("listitem")).toHaveTextContent("期限切れ");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderView();

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 空のとき -----
  it("1 枚も無くても、受け取り欄は残す", () => {
    renderView([]);

    expect(screen.getByText("まだクーポンはありません。")).toBeVisible();
    expect(screen.getByLabelText("キャンペーンコード")).toBeVisible();
  });
});

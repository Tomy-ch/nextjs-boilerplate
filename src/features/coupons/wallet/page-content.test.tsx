// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HeldCoupon } from "@/model/coupon/coupon";

const { getMyCoupons } = vi.hoisted(() => ({ getMyCoupons: vi.fn() }));

vi.mock("@/adapters/server/api/coupons", () => ({ getMyCoupons }));
vi.mock("./view", () => ({
  WalletView: ({ coupons, now }: { coupons: readonly HeldCoupon[]; now: Date }) => (
    <p>
      {coupons.length} 枚 {now.toISOString()}
    </p>
  ),
}));

import { FIXTURE_NOW, HELD_COUPONS } from "../coupons.fixture";
import { WalletPageContent } from "./page-content";

beforeEach(() => {
  getMyCoupons.mockReset().mockResolvedValue(HELD_COUPONS);
});

describe("WalletPageContent", () => {
  it("取得した保有クーポンと、渡された時刻を画面へ渡す", async () => {
    render(await WalletPageContent({ now: FIXTURE_NOW }));

    expect(screen.getByText(`4 枚 ${FIXTURE_NOW.toISOString()}`)).toBeVisible();
  });

  it("取得に失敗したら握りつぶさずに投げ、route の境界へ任せる", async () => {
    const error = new Error("取得できない");

    getMyCoupons.mockRejectedValue(error);

    await expect(WalletPageContent({ now: FIXTURE_NOW })).rejects.toBe(error);
  });
});

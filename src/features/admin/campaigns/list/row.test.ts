import { describe, expect, it } from "vitest";

import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";
import { type Campaign, toCampaignId } from "@/model/campaign/campaign";
import { COUPON_SCOPE_NAME, type CouponScopeKind } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";

import { toAdminCampaignRows } from "./row";

const ID = toCampaignId("0195f0c2-0000-7000-8000-0000000000c1");
const STARTS_AT = "2026-03-01T00:00:00.000Z";
const ENDS_AT = "2026-03-31T15:00:00.000Z";
const COUPON_EXPIRES_AT = "2026-04-30T15:00:00.000Z";
const SUSPENDED_AT = "2026-02-15T03:30:00.000Z";

const BEFORE = new Date("2026-02-20T00:00:00.000Z");
const DURING = new Date("2026-03-15T00:00:00.000Z");
const AFTER = new Date("2026-04-15T00:00:00.000Z");

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: ID,
    code: "SPRING2026",
    discount: { kind: "rate", value: "0.10", maxAmount: 500 },
    scopeKind: "all",
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    couponExpiresAt: COUPON_EXPIRES_AT,
    totalLimit: 1000,
    issuedCount: 300,
    suspendedAt: null,
    ...overrides,
  };
}

function rowOf(source: Campaign, now: Date = DURING) {
  const [row] = toAdminCampaignRows([source], now);

  if (row === undefined) throw new Error("1 件を写した結果が空です");

  return row;
}

describe("toAdminCampaignRows", () => {
  // ----- 正常系 -----
  it("識別子・コード・総枚数をそのまま運ぶ", () => {
    const row = rowOf(campaign());

    expect(row.id).toBe(ID);
    expect(row.code).toBe("SPRING2026");
    expect(row.totalLimit).toBe(1000);
  });

  it("残り枚数を、総枚数から配った枚数を引いた差にする", () => {
    expect(rowOf(campaign({ totalLimit: 1000, issuedCount: 300 })).remaining).toBe(700);
  });

  it("配りきったキャンペーンの残り枚数は 0 にする", () => {
    expect(rowOf(campaign({ totalLimit: 300, issuedCount: 300 })).remaining).toBe(0);
  });

  it("期間の前のキャンペーンを、配布前の見た目と操作できる行にする", () => {
    const row = rowOf(campaign(), BEFORE);

    expect(row.statusName).toBe("配布前");
    expect(row.statusTone).toBe(BADGE_VARIANT.WARNING);
    expect(row.suspendedAt).toBeNull();
  });

  it("期間の中のキャンペーンを、配布中の見た目と操作できる行にする", () => {
    const row = rowOf(campaign(), DURING);

    expect(row.statusName).toBe("配布中");
    expect(row.statusTone).toBe(BADGE_VARIANT.SECONDARY);
    expect(row.suspendedAt).toBeNull();
  });

  it("期間を過ぎたキャンペーンを、期間外の見た目と操作できる行にする", () => {
    const row = rowOf(campaign(), AFTER);

    expect(row.statusName).toBe("期間外");
    expect(row.statusTone).toBe(BADGE_VARIANT.OUTLINE);
    expect(row.suspendedAt).toBeNull();
  });

  it("停止したキャンペーンを、停止の見た目と停止済みの行にする", () => {
    const row = rowOf(campaign({ suspendedAt: SUSPENDED_AT }), BEFORE);

    expect(row.statusName).toBe("停止");
    expect(row.statusTone).toBe(BADGE_VARIANT.DEFAULT);
    expect(row.suspendedAt).toBe(formatDateTime(new Date(SUSPENDED_AT)));
  });

  it("期間の中でも、停止していれば停止の行にする", () => {
    const row = rowOf(campaign({ suspendedAt: SUSPENDED_AT }), DURING);

    expect(row.statusName).toBe("停止");
    expect(row.suspendedAt).toBe(formatDateTime(new Date(SUSPENDED_AT)));
  });

  it("開始の時刻ちょうどは、配布中の行にする", () => {
    expect(rowOf(campaign(), new Date(STARTS_AT)).statusName).toBe("配布中");
  });

  it("終了の時刻ちょうどは、期間外の行にする", () => {
    expect(rowOf(campaign(), new Date(ENDS_AT)).statusName).toBe("期間外");
  });

  it("停止していなければ、停止日時を持たない", () => {
    expect(rowOf(campaign({ suspendedAt: null })).suspendedAt).toBeNull();
  });

  it("停止していれば、停止日時を表示の形に整える", () => {
    expect(rowOf(campaign({ suspendedAt: SUSPENDED_AT })).suspendedAt).toBe(
      formatDateTime(new Date(SUSPENDED_AT)),
    );
  });

  it("配布期間の両端とクーポンの有効期限を、表示の形に整える", () => {
    const row = rowOf(campaign());

    expect(row.startsAt).toBe(formatDateTime(new Date(STARTS_AT)));
    expect(row.endsAt).toBe(formatDateTime(new Date(ENDS_AT)));
    expect(row.couponExpiresAt).toBe(formatDateTime(new Date(COUPON_EXPIRES_AT)));
  });

  it("上限つきの定率の値引きは、額面と上限を整えて持つ", () => {
    const discount = { kind: "rate", value: "0.10", maxAmount: 500 } as const;
    const row = rowOf(campaign({ discount }));

    expect(row.discount).toBe(formatCouponDiscount(discount));
    expect(row.discountCap).toBe(formatCouponDiscountCap(discount));
    expect(row.discountCap).not.toBeUndefined();
  });

  it("上限の無い定率の値引きは、上限を持たない", () => {
    const discount = { kind: "rate", value: "0.20", maxAmount: null } as const;
    const row = rowOf(campaign({ discount }));

    expect(row.discount).toBe(formatCouponDiscount(discount));
    expect(row.discountCap).toBeUndefined();
  });

  it("定額の値引きは、上限を持たない", () => {
    const discount = { kind: "flat", value: "5.00" } as const;
    const row = rowOf(campaign({ discount }));

    expect(row.discount).toBe(formatCouponDiscount(discount));
    expect(row.discountCap).toBeUndefined();
  });

  it.each<{ scopeKind: CouponScopeKind }>([
    { scopeKind: "all" },
    { scopeKind: "category" },
    { scopeKind: "product" },
  ])("適用範囲（$scopeKind）を、その呼び名にする", ({ scopeKind }) => {
    expect(rowOf(campaign({ scopeKind })).scopeName).toBe(COUPON_SCOPE_NAME[scopeKind]);
  });

  it("1 件も無ければ空の並びを返す", () => {
    expect(toAdminCampaignRows([], DURING)).toEqual([]);
  });

  it("受け取った順序をそのまま保つ", () => {
    const rows = toAdminCampaignRows(
      [
        campaign({ code: "SECOND", id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c2") }),
        campaign({ code: "FIRST" }),
      ],
      DURING,
    );

    expect(rows.map((row) => row.code)).toEqual(["SECOND", "FIRST"]);
  });

  it("状態は行ごとに、それぞれの期間と停止から決める", () => {
    const rows = toAdminCampaignRows(
      [
        campaign({ code: "UPCOMING", startsAt: "2026-04-01T00:00:00.000Z" }),
        campaign({ code: "ACTIVE" }),
        campaign({ code: "SUSPENDED", suspendedAt: SUSPENDED_AT }),
        campaign({ code: "ENDED", endsAt: "2026-03-10T00:00:00.000Z" }),
      ],
      DURING,
    );

    expect(rows.map((row) => [row.code, row.statusName, row.suspendedAt])).toEqual([
      ["UPCOMING", "配布前", null],
      ["ACTIVE", "配布中", null],
      ["SUSPENDED", "停止", formatDateTime(new Date(SUSPENDED_AT))],
      ["ENDED", "期間外", null],
    ]);
  });
});

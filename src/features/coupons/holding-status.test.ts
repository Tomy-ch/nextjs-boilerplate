import { describe, expect, it } from "vitest";

import type { HeldCoupon } from "@/model/coupon/coupon";

import {
  EXPIRED_COUPON,
  FIXTURE_NOW,
  NOT_STARTED_COUPON,
  UNUSED_COUPON,
  USED_COUPON,
} from "./coupons.fixture";
import { holdingStatusAt } from "./holding-status";

const USABLE_FROM = new Date("2026-02-01T00:00:00Z");

function shiftedBy(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

describe("holdingStatusAt", () => {
  // ----- 正常系 -----
  it.each([
    ["unused", UNUSED_COUPON],
    ["notStarted", NOT_STARTED_COUPON],
    ["used", USED_COUPON],
    ["expired", EXPIRED_COUPON],
  ] as const)("%s の券を、その状態と判定する", (status, coupon) => {
    expect(holdingStatusAt(coupon, FIXTURE_NOW)).toBe(status);
  });

  it("期限ちょうどから期限切れとして扱う", () => {
    expect(holdingStatusAt(UNUSED_COUPON, UNUSED_COUPON.expiresAt)).toBe("expired");
  });

  it("期限の直前までは期限切れにしない", () => {
    expect(holdingStatusAt(UNUSED_COUPON, shiftedBy(UNUSED_COUPON.expiresAt, -1))).toBe("unused");
  });

  it("利用開始ちょうどから使える状態として扱う", () => {
    const coupon: HeldCoupon = { ...NOT_STARTED_COUPON, usableFrom: USABLE_FROM };

    expect(holdingStatusAt(coupon, USABLE_FROM)).toBe("unused");
  });

  it("利用開始の直前までは利用開始前とする", () => {
    const coupon: HeldCoupon = { ...NOT_STARTED_COUPON, usableFrom: USABLE_FROM };

    expect(holdingStatusAt(coupon, shiftedBy(USABLE_FROM, -1))).toBe("notStarted");
  });

  it("利用開始の時刻が無ければ、発行の時点から使える", () => {
    const coupon: HeldCoupon = { ...NOT_STARTED_COUPON, usableFrom: null };

    expect(holdingStatusAt(coupon, FIXTURE_NOW)).toBe("unused");
  });

  it("使用済みの券は、期限を過ぎていても使用済みと言う", () => {
    expect(holdingStatusAt(USED_COUPON, shiftedBy(USED_COUPON.expiresAt, 1))).toBe("used");
  });

  it("使用済みの券は、利用開始前の時刻でも使用済みと言う", () => {
    const coupon: HeldCoupon = { ...USED_COUPON, usableFrom: shiftedBy(FIXTURE_NOW, 1) };

    expect(holdingStatusAt(coupon, FIXTURE_NOW)).toBe("used");
  });

  // ----- 異常系 -----
  it("期限が利用開始より前という矛盾した券は、期限切れと言う", () => {
    const coupon: HeldCoupon = {
      ...UNUSED_COUPON,
      usableFrom: shiftedBy(FIXTURE_NOW, 1),
      expiresAt: FIXTURE_NOW,
    };

    expect(holdingStatusAt(coupon, FIXTURE_NOW)).toBe("expired");
  });
});

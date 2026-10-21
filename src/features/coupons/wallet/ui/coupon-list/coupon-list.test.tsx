// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { COUPON_SCOPE_NAME, type HeldCoupon } from "@/model/coupon/coupon";
import { formatCouponDiscount, formatCouponDiscountCap } from "@/model/coupon/discount-label";
import { formatDateTime } from "@/model/datetime";
import { formatMoney } from "@/model/money";

import {
  EXPIRED_COUPON,
  FIXTURE_NOW,
  HELD_COUPONS,
  NOT_STARTED_COUPON,
  UNUSED_COUPON,
  USED_COUPON,
} from "../../../coupons.fixture";
import { CouponList } from "./coupon-list";

function present<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`fixture の ${name} がありません。`);
  }

  return value;
}

function rowOf(coupons: readonly HeldCoupon[], index: number): HTMLElement {
  render(<CouponList coupons={coupons} now={FIXTURE_NOW} />);

  const row = screen.getAllByRole("listitem")[index];

  if (row === undefined) {
    throw new Error(`${index} 行目がありません。`);
  }

  return row;
}

describe("CouponList", () => {
  // ----- 揃っているとき -----
  it("各行に、その券の状態名を応答の順のまま出す", () => {
    render(<CouponList coupons={HELD_COUPONS} now={FIXTURE_NOW} />);

    const rows = screen.getAllByRole("listitem");

    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("未使用");
    expect(rows[1]).toHaveTextContent("利用開始前");
    expect(rows[2]).toHaveTextContent("使用済み");
    expect(rows[3]).toHaveTextContent("期限切れ");
  });

  it("状態は渡された時刻に照らして決め、期限を迎えた券を期限切れにする", () => {
    render(<CouponList coupons={[UNUSED_COUPON]} now={UNUSED_COUPON.expiresAt} />);

    const row = screen.getByRole("listitem");

    expect(row).toHaveTextContent("期限切れ");
    expect(row).not.toHaveTextContent("未使用");
  });

  it("使用済みの券は使った日時を出し、期限は出さない", () => {
    const row = rowOf([USED_COUPON], 0);

    expect(row).toHaveTextContent(`使用 ${formatDateTime(present(USED_COUPON.usedAt, "usedAt"))}`);
    expect(row).not.toHaveTextContent("期限");
  });

  it("利用開始前の券は、使えるようになる日時と期限を並べて出す", () => {
    const row = rowOf([NOT_STARTED_COUPON], 0);
    const usableFrom = present(NOT_STARTED_COUPON.usableFrom, "usableFrom");

    expect(row).toHaveTextContent(
      `利用開始 ${formatDateTime(usableFrom)}・期限 ${formatDateTime(NOT_STARTED_COUPON.expiresAt)}`,
    );
  });

  it.each([
    ["未使用", UNUSED_COUPON],
    ["期限切れ", EXPIRED_COUPON],
  ])("%sの券は期限だけを出す", (_label, coupon) => {
    const row = rowOf([coupon], 0);

    expect(row).toHaveTextContent(`期限 ${formatDateTime(coupon.expiresAt)}`);
    expect(row).not.toHaveTextContent("使用 ");
    expect(row).not.toHaveTextContent("利用開始 ");
  });

  it("上限のある定率の値引きには、上限を添える", () => {
    const row = rowOf([UNUSED_COUPON], 0);

    const cap = present(formatCouponDiscountCap(UNUSED_COUPON.discount), "上限");

    expect(row).toHaveTextContent(`${formatCouponDiscount(UNUSED_COUPON.discount)}（${cap}）`);
  });

  it.each([
    ["上限の無い定率", EXPIRED_COUPON],
    ["定額", USED_COUPON],
  ])("%sの値引きには上限を添えない", (_label, coupon) => {
    const row = rowOf([coupon], 0);

    expect(row).toHaveTextContent(formatCouponDiscount(coupon.discount));
    expect(row).not.toHaveTextContent("上限");
  });

  it.each([
    ["all", USED_COUPON],
    ["category", UNUSED_COUPON],
    ["product", EXPIRED_COUPON],
  ] as const)("範囲が %s なら、その呼び名で対象を言う", (scopeKind, coupon) => {
    const row = rowOf([coupon], 0);

    expect(row).toHaveTextContent(`${COUPON_SCOPE_NAME[scopeKind]}が対象`);
  });

  it("購入額の下限があれば、対象に続けて添える", () => {
    const row = rowOf([UNUSED_COUPON], 0);

    expect(row).toHaveTextContent(
      `${COUPON_SCOPE_NAME.category}が対象・購入額 ${formatMoney(present(UNUSED_COUPON.minPurchaseAmount, "minPurchaseAmount"))} 以上`,
    );
  });

  it("購入額の下限が無ければ、対象だけを言う", () => {
    const row = rowOf([EXPIRED_COUPON], 0);

    expect(row).not.toHaveTextContent("購入額");
  });

  it("行は読むためのもので、押せる要素を持たない", () => {
    render(<CouponList coupons={HELD_COUPONS} now={FIXTURE_NOW} />);

    for (const row of screen.getAllByRole("listitem")) {
      expect(within(row).queryByRole("link")).not.toBeInTheDocument();
      expect(within(row).queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<CouponList coupons={HELD_COUPONS} now={FIXTURE_NOW} />);

    expect((await axe(container)).violations).toEqual([]);
  });

  // ----- 空のとき -----
  it("1 枚も無ければ、無いことと受け取り欄を伝え、一覧を作らない", () => {
    render(<CouponList coupons={[]} now={FIXTURE_NOW} />);

    expect(screen.getByRole("status")).toHaveTextContent("まだクーポンはありません。");
    expect(screen.getByRole("status")).toHaveTextContent("上の欄から受け取れます");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("空のときも a11y 自動検査に違反しない", async () => {
    const { container } = render(<CouponList coupons={[]} now={FIXTURE_NOW} />);

    expect((await axe(container)).violations).toEqual([]);
  });
});

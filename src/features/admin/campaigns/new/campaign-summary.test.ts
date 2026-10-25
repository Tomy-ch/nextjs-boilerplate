import { describe, expect, it } from "vitest";

import { COUPON_SCOPE_NAME } from "@/model/coupon/coupon";

import type { CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import type { CampaignOwnValues } from "./campaign-rules";
import { type CampaignConfirmation, confirmationOf } from "./campaign-summary";

const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000011";
const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000021";

const OWN: CampaignOwnValues = {
  code: " summer-2026 ",
  startsAt: "2026-10-01T10:00",
  endsAt: "2026-11-01T00:00",
  couponExpiresAt: "2026-12-01T00:00",
  usableFrom: "2026-10-05T09:00",
  totalLimit: "100",
  perUserLimit: "2",
  minPurchaseAmount: "50",
};

const FLAT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "20" };

const ALL: CouponScopeValues = {
  kind: "all",
  categoryId: CATEGORY_ID,
  productId: PRODUCT_ID,
  productName: "Tシャツ",
};

/** 確認の復唱から、見出しが一致する行の文を取る。無ければ失敗させる。 */
function detailOf(confirmation: CampaignConfirmation, term: string): string {
  const row = confirmation.summary.find((candidate) => candidate.term === term);

  if (row === undefined) {
    throw new Error(`復唱に ${term} の行がありません`);
  }

  return row.detail;
}

describe("confirmationOf", () => {
  // ----- 正常系 -----
  it("定額・全体のときは、種別に応じて要る項目だけを決まった順で送る", () => {
    expect(confirmationOf(OWN, FLAT, ALL, "").fields).toStrictEqual([
      ["code", " summer-2026 "],
      ["startsAt", "2026-10-01T01:00:00.000Z"],
      ["endsAt", "2026-10-31T15:00:00.000Z"],
      ["couponExpiresAt", "2026-11-30T15:00:00.000Z"],
      ["usableFrom", "2026-10-05T00:00:00.000Z"],
      ["totalLimit", "100"],
      ["perUserLimit", "2"],
      ["minPurchaseAmount", "50"],
      ["discountKind", "flat"],
      ["discountValue", "5"],
      ["scopeKind", "all"],
    ]);
  });

  it("定率のときだけ、上限額を末尾に足して送る", () => {
    const { fields } = confirmationOf(OWN, { kind: "rate", value: "10", maxAmount: "20" }, ALL, "");

    expect(fields.at(-1)).toStrictEqual(["discountMaxAmount", "20"]);
    expect(fields.map(([name]) => name)).not.toContain("scopeCategoryId");
    expect(fields.map(([name]) => name)).not.toContain("scopeProductId");
  });

  it("カテゴリに絞るときだけ、カテゴリを末尾に足して送る", () => {
    const { fields } = confirmationOf(OWN, FLAT, { ...ALL, kind: "category" }, "トップス");

    expect(fields.at(-1)).toStrictEqual(["scopeCategoryId", CATEGORY_ID]);
    expect(fields.map(([name]) => name)).not.toContain("scopeProductId");
    expect(fields.map(([name]) => name)).not.toContain("discountMaxAmount");
  });

  it("商品に絞るときだけ、商品を末尾に足して送り、商品の名前は送らない", () => {
    const { fields } = confirmationOf(OWN, FLAT, { ...ALL, kind: "product" }, "");

    expect(fields.at(-1)).toStrictEqual(["scopeProductId", PRODUCT_ID]);
    expect(fields.map(([name]) => name)).not.toContain("scopeCategoryId");
    expect(fields.map(([, value]) => value)).not.toContain("Tシャツ");
  });

  it("復唱を 8 行、決まった順で並べ、コードは保存される綴りで見せる", () => {
    expect(confirmationOf(OWN, FLAT, ALL, "").summary).toStrictEqual([
      { term: "キャンペーンコード", detail: "SUMMER-2026" },
      { term: "値引き", detail: "5 ドル引き" },
      { term: "値引きの対象", detail: COUPON_SCOPE_NAME.all },
      { term: "配布期間", detail: "2026/10/01 10:00 〜 2026/11/01 00:00" },
      { term: "クーポンの有効期限", detail: "2026/12/01 00:00" },
      { term: "クーポンの利用開始", detail: "2026/10/05 09:00" },
      { term: "上限", detail: "総 100 枚・1 人 2 枚まで" },
      { term: "最低購入額", detail: "50 ドル以上" },
    ]);
  });

  it("定率で上限額が無ければ、率だけを復唱する", () => {
    expect(
      detailOf(
        confirmationOf(OWN, { kind: "rate", value: "10", maxAmount: "" }, ALL, ""),
        "値引き",
      ),
    ).toBe("10% 引き");
  });

  it("定率で上限額があれば、1 回あたりの上限を添えて復唱する", () => {
    expect(
      detailOf(
        confirmationOf(OWN, { kind: "rate", value: "10", maxAmount: "20" }, ALL, ""),
        "値引き",
      ),
    ).toBe("10% 引き（1 回 20 ドルまで）");
  });

  it("カテゴリに絞るときは、渡されたカテゴリの名前で復唱する", () => {
    expect(
      detailOf(confirmationOf(OWN, FLAT, { ...ALL, kind: "category" }, "トップス"), "値引きの対象"),
    ).toBe(`${COUPON_SCOPE_NAME.category}：トップス`);
  });

  it("商品に絞るときは、選んだ商品の名前で復唱する", () => {
    expect(
      detailOf(confirmationOf(OWN, FLAT, { ...ALL, kind: "product" }, "トップス"), "値引きの対象"),
    ).toBe(`${COUPON_SCOPE_NAME.product}：Tシャツ`);
  });

  it("利用開始が空なら、受け取った時点から使えると復唱し、空のまま送る", () => {
    const confirmation = confirmationOf({ ...OWN, usableFrom: "" }, FLAT, ALL, "");

    expect(detailOf(confirmation, "クーポンの利用開始")).toBe("受け取った時点から");
    expect(confirmation.fields).toContainEqual(["usableFrom", ""]);
  });

  it("最低購入額が空なら、条件が無いと復唱する", () => {
    expect(
      detailOf(confirmationOf({ ...OWN, minPurchaseAmount: "" }, FLAT, ALL, ""), "最低購入額"),
    ).toBe("なし");
  });
});

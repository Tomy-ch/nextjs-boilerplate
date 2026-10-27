import { describe, expect, it } from "vitest";

import { COUPON_SCOPE_NAME } from "@/model/coupon/coupon";

import type { CouponDiscountValues } from "../../coupon-discount";
import type { CouponScopeValues } from "../../coupon-scope";
import type { IssueOwnValues } from "./issue-rules";
import { confirmationOf, type IssueConfirmation } from "./issue-summary";

const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000011";

const OWN: IssueOwnValues = {
  expiresAt: "2026-12-31T23:59",
  usableFrom: "2026-12-01T09:00",
  minPurchaseAmount: "50",
};

const FLAT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "" };

const CATEGORY: CouponScopeValues = {
  kind: "category",
  categoryId: CATEGORY_ID,
  productId: "",
  productName: "",
};

function detailOf(confirmation: IssueConfirmation, term: string): string {
  const row = confirmation.summary.find((candidate) => candidate.term === term);

  if (row === undefined) {
    throw new Error(`復唱に ${term} の行がありません`);
  }

  return row.detail;
}

describe("confirmationOf", () => {
  // ----- 正常系 -----
  it("クーポン自身の 3 項目を瞬間へ確定させて先に並べ、値引きと範囲を続けて送る", () => {
    expect(confirmationOf(OWN, FLAT, CATEGORY, "家電").fields).toStrictEqual([
      ["expiresAt", "2026-12-31T14:59:00.000Z"],
      ["usableFrom", "2026-12-01T00:00:00.000Z"],
      ["minPurchaseAmount", "50"],
      ["discountKind", "flat"],
      ["discountValue", "5"],
      ["scopeKind", "category"],
      ["scopeCategoryId", CATEGORY_ID],
    ]);
  });

  it("復唱を 5 行、決まった順で並べ、日時は打たれた壁時計の綴りで見せる", () => {
    expect(confirmationOf(OWN, FLAT, CATEGORY, "家電").summary).toStrictEqual([
      { term: "値引き", detail: "5 ドル引き" },
      { term: "値引きの対象", detail: `${COUPON_SCOPE_NAME.category}：家電` },
      { term: "有効期限", detail: "2026/12/31 23:59" },
      { term: "利用開始", detail: "2026/12/01 09:00" },
      { term: "最低購入額", detail: "50 ドル以上" },
    ]);
  });

  it("カテゴリに絞るときは、渡されたカテゴリの名前で復唱する", () => {
    expect(detailOf(confirmationOf(OWN, FLAT, CATEGORY, "雑貨"), "値引きの対象")).toBe(
      `${COUPON_SCOPE_NAME.category}：雑貨`,
    );
  });

  it("利用開始が空なら、発行した時点から使えると復唱し、空のまま送る", () => {
    const confirmation = confirmationOf({ ...OWN, usableFrom: "" }, FLAT, CATEGORY, "家電");

    expect(detailOf(confirmation, "利用開始")).toBe("発行した時点から");
    expect(confirmation.fields).toContainEqual(["usableFrom", ""]);
  });

  it("最低購入額が空なら、条件が無いと復唱する", () => {
    expect(
      detailOf(
        confirmationOf({ ...OWN, minPurchaseAmount: "" }, FLAT, CATEGORY, "家電"),
        "最低購入額",
      ),
    ).toBe("なし");
  });
});

import "server-only";

import type { CouponScopeTarget } from "@/model/coupon/coupon";

import type { CouponScopeInput } from "../../gen/api/model";

/**
 * 範囲を契約の形へ写す。
 *
 * @param scope - 表示用の範囲
 * @returns 契約が受け付ける範囲。全体は対象を null で送る
 */
export function toCouponScopeInput(scope: CouponScopeTarget): CouponScopeInput {
  switch (scope.kind) {
    case "all":
      return { kind: "all", targetId: null };
    case "category":
      return { kind: "category", targetId: scope.categoryId };
    case "product":
      return { kind: "product", targetId: scope.productId };
  }
}

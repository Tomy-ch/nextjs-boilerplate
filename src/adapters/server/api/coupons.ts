import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { type HeldCoupon, toCouponId } from "@/model/coupon/coupon";

import { GetUsersMeCouponsResponse } from "../../gen/api/endpoints.zod";
import { getUserScopedClient } from "../http/user-scoped-client";
import { toCouponDiscount } from "./coupon-discount";

type WireHeldCoupon = z.infer<typeof GetUsersMeCouponsResponse>["coupons"][number];

/**
 * 契約の保有クーポンを表示用の型へ写す。
 *
 * @remarks
 * 範囲を絞る対象の識別子と発行日時は写しません。前者は名前が届かず表示に使えず、後者は並びが
 * 応答の順序で既に表れているためです。
 *
 * @param wire - 契約の保有クーポン
 * @returns 表示用の保有クーポン
 */
function toHeldCoupon(wire: WireHeldCoupon): HeldCoupon {
  return {
    id: toCouponId(wire.id),
    discount: toCouponDiscount(wire.discount),
    scopeKind: wire.scope.kind,
    minPurchaseAmount: wire.minPurchaseAmount,
    usableFrom: wire.usableFrom === null ? null : new Date(wire.usableFrom),
    expiresAt: new Date(wire.expiresAt),
    usedAt: wire.usedAt === null ? null : new Date(wire.usedAt),
  };
}

/**
 * 自分の保有クーポンを取得する。
 *
 * @remarks
 * **使用済み・失効済みも並びます。** 契約が返すのは「使えるもの」ではなく「持っているもの」です。
 * 発行日時の新しい順で、ページングはありません。1 枚も無ければ空配列です。
 *
 * @returns 自分の保有クーポン。応答の順序のまま
 */
export const getMyCoupons = cache(async (): Promise<readonly HeldCoupon[]> => {
  const wire = await getUserScopedClient().request({
    path: "/v1/users/me/coupons",
    schema: GetUsersMeCouponsResponse,
  });

  return wire.coupons.map(toHeldCoupon);
});

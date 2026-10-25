import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getLogger, reportQuietly } from "@/logging/logging.server";
import { type CartCoupon, type HeldCoupon, toCouponId } from "@/model/coupon/coupon";

import { GetCartsMeCouponsResponse, GetUsersMeCouponsResponse } from "../../gen/api/endpoints.zod";
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

/**
 * いまのカートに対して使えるクーポンと、それぞれを適用した場合の値引き額を取得する。
 *
 * @remarks
 * **使えるかどうかと値引き額は、ここでもその先でも判定しません。** どのクーポンがどの明細に
 * 効いていくら引かれるかはバックエンドが決め、この口はその結果を並びのまま返します。
 *
 * カートを持たない場合も、使えるクーポンが 1 枚も無い場合も、空配列が返ります。
 *
 * 通信の失敗は投げます。**画面が使う口はこちらではなく {@link readMyCartCoupons}** です。
 *
 * @returns 使えるクーポンと値引き額。契約が返した順
 */
export const getMyCartCoupons = cache(async (): Promise<readonly CartCoupon[]> => {
  const wire = await getUserScopedClient().request({
    path: "/v1/carts/me/coupons",
    schema: GetCartsMeCouponsResponse,
  });

  return wire.coupons.map(({ coupon, discountAmount }) => ({
    id: toCouponId(coupon.id),
    discount: toCouponDiscount(coupon.discount),
    scopeKind: coupon.scope.kind,
    discountAmount,
    expiresAt: new Date(coupon.expiresAt),
  }));
});

/**
 * いまのカートに対して使えるクーポンを読む。読めなくても投げない。
 *
 * @remarks
 * **候補が読めなくても購入は確定できます。** クーポンは購入の必須要素ではなく、投げると候補の
 * 取得が落ちているあいだ購入確認そのものが開けなくなります。
 *
 * 読めなかったことは `null` で、使えるクーポンが無いことは空配列で返します。失敗した事実は
 * 記録に残します。
 *
 * @returns 使えるクーポンと値引き額。読めなければ null
 */
export async function readMyCartCoupons(): Promise<readonly CartCoupon[] | null> {
  try {
    return await getMyCartCoupons();
  } catch (cause) {
    reportQuietly(() =>
      getLogger().warn("使えるクーポンを読めませんでした", { cause: String(cause) }),
    );

    return null;
  }
}

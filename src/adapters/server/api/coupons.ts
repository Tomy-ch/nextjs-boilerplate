import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getLogger, reportQuietly } from "@/logging/logging.server";
import { type CartCoupon, toCouponId } from "@/model/coupon/coupon";

import { GetCartsMeCouponsResponse } from "../../gen/api/endpoints.zod";
import { getUserScopedClient } from "../http/user-scoped-client";
import { toCouponDiscount } from "./coupon-discount";

type WireCartCoupons = z.infer<typeof GetCartsMeCouponsResponse>;

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
    expiresAt: coupon.expiresAt,
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

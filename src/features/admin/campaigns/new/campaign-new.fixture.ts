import { toProductId } from "@/model/product/product";

import type { CouponDiscountValues } from "../../coupon-discount";
import type { AdminSelectOption } from "../../ui/select-field/select-field";
import type { CampaignOwnValues } from "./campaign-rules";
import type { CouponScopeValues } from "./coupon-scope";
import type { ProductCandidates } from "./use-product-candidates";

/** 範囲として選べるカテゴリ。 */
export const CAMPAIGN_CATEGORY_OPTIONS: readonly AdminSelectOption[] = [
  { value: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2", label: "家電" },
  { value: "6ee63e95-89fc-4b63-cb1c-3f22d06d3b03", label: "雑貨" },
];

/** 商品名で探して見つかった候補。 */
export const FOUND_PRODUCTS: ProductCandidates = {
  status: "found",
  items: [
    { id: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b11"), name: "ワイヤレスイヤホン" },
    { id: toProductId("0f4b2f2e-6a3f-4c4a-9e6e-2b1d8f2a1b12"), name: "ワイヤレス充電器" },
  ],
  hasMore: false,
};

/** 打ち終えたキャンペーン自身の項目。日時は `datetime-local` の壁時計の値。 */
export const FILLED_OWN_VALUES: CampaignOwnValues = {
  code: "welcome-2026",
  startsAt: "2026-10-01T00:00",
  endsAt: "2026-11-30T23:59",
  couponExpiresAt: "2026-12-31T23:59",
  usableFrom: "",
  totalLimit: "1000",
  perUserLimit: "1",
  minPurchaseAmount: "50",
};

/** 打ち終えた値引き。15% 引きで、1 回 20 ドルまで。 */
export const FILLED_DISCOUNT_VALUES: CouponDiscountValues = {
  kind: "rate",
  value: "15",
  maxAmount: "20",
};

/** 選び終えた範囲。カテゴリで絞る。 */
export const FILLED_SCOPE_VALUES: CouponScopeValues = {
  kind: "category",
  categoryId: "5dd52d84-78eb-4a52-ba0b-2e11c95c2af2",
  productId: "",
  productName: "",
};

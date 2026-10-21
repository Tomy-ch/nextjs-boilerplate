import { describe, expect, it } from "vitest";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import {
  COUPON_DISCOUNT_RATE_INVALID_MESSAGE,
  COUPON_VALIDITY_DAYS_INVALID_MESSAGE,
} from "./coupon-rules";
import { DISCONTINUE_CONFIRMED_VALUE, DISCONTINUE_FORM_NAMES } from "./form-names";
import { DISCONTINUE_TARGET_LOST_MESSAGE } from "./form-state";
import { parseDiscontinueForm } from "./parse-discontinue-form";

const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000001";
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";

type DiscontinueFormValues = Readonly<
  Record<keyof typeof DISCONTINUE_FORM_NAMES | "idempotencyKey", string | null>
>;

/** 送信の 1 件を組む。null を渡した項目は「届かなかった」ことを表す。 */
function formData(overrides: Partial<DiscontinueFormValues> = {}): FormData {
  const values: DiscontinueFormValues = {
    productId: PRODUCT_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    couponDiscountRate: "10",
    couponValidityDays: "30",
    confirmed: DISCONTINUE_CONFIRMED_VALUE,
    ...overrides,
  };
  const data = new FormData();

  for (const [field, name] of [
    ["productId", DISCONTINUE_FORM_NAMES.productId],
    ["idempotencyKey", IDEMPOTENCY_KEY_FIELD],
    ["couponDiscountRate", DISCONTINUE_FORM_NAMES.couponDiscountRate],
    ["couponValidityDays", DISCONTINUE_FORM_NAMES.couponValidityDays],
    ["confirmed", DISCONTINUE_FORM_NAMES.confirmed],
  ] as const) {
    const value = values[field];

    if (value !== null) data.append(name, value);
  }

  return data;
}

describe("parseDiscontinueForm", () => {
  // ----- 正常系 -----
  it("揃った送信を、対象・冪等キー・契約の形の条件として読む", () => {
    expect(parseDiscontinueForm(formData())).toEqual({
      ok: true,
      productId: PRODUCT_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      conditions: { couponDiscountRate: "0.10", couponValidityDays: 30 },
    });
  });

  it("値引き率は百分率の綴りから小数点をずらして読む", () => {
    const parsed = parseDiscontinueForm(formData({ couponDiscountRate: "12.5" }));

    expect(parsed.ok && parsed.conditions.couponDiscountRate).toBe("0.125");
  });

  // ----- 異常系 -----
  it.each<{ label: string; overrides: Partial<DiscontinueFormValues> }>([
    { label: "対象が届かない", overrides: { productId: null } },
    { label: "対象が空", overrides: { productId: "" } },
    { label: "冪等キーが届かない", overrides: { idempotencyKey: null } },
    { label: "冪等キーが UUID でない", overrides: { idempotencyKey: "not-a-uuid" } },
    { label: "確認の合図が届かない", overrides: { confirmed: null } },
    { label: "確認の合図が別の値", overrides: { confirmed: "false" } },
  ])("$label送信は、入力の誤りではなく開き直す案内を返す", ({ overrides }) => {
    expect(parseDiscontinueForm(formData(overrides))).toEqual({
      ok: false,
      formError: DISCONTINUE_TARGET_LOST_MESSAGE,
    });
  });

  it("確認の合図が無ければ、条件が読めなくても開き直す案内を先に返す", () => {
    expect(parseDiscontinueForm(formData({ confirmed: null, couponDiscountRate: "abc" }))).toEqual({
      ok: false,
      formError: DISCONTINUE_TARGET_LOST_MESSAGE,
    });
  });

  it("対象がファイルで届けば、届かなかったものとして扱う", () => {
    const data = formData({ productId: null });

    data.append(DISCONTINUE_FORM_NAMES.productId, new File(["x"], "id.txt"));

    expect(parseDiscontinueForm(data)).toEqual({
      ok: false,
      formError: DISCONTINUE_TARGET_LOST_MESSAGE,
    });
  });

  it("値引き率だけが読めなければ、その欄だけに文言を返す", () => {
    expect(parseDiscontinueForm(formData({ couponDiscountRate: "10%" }))).toStrictEqual({
      ok: false,
      formError: null,
      fieldErrors: { couponDiscountRate: [COUPON_DISCOUNT_RATE_INVALID_MESSAGE] },
    });
  });

  it("有効日数だけが読めなければ、その欄だけに文言を返す", () => {
    expect(parseDiscontinueForm(formData({ couponValidityDays: "366" }))).toStrictEqual({
      ok: false,
      formError: null,
      fieldErrors: { couponValidityDays: [COUPON_VALIDITY_DAYS_INVALID_MESSAGE] },
    });
  });

  it("条件が両方とも届かなければ、両方の欄に文言を返す", () => {
    expect(
      parseDiscontinueForm(formData({ couponDiscountRate: null, couponValidityDays: null })),
    ).toEqual({
      ok: false,
      formError: null,
      fieldErrors: {
        couponDiscountRate: [COUPON_DISCOUNT_RATE_INVALID_MESSAGE],
        couponValidityDays: [COUPON_VALIDITY_DAYS_INVALID_MESSAGE],
      },
    });
  });
});

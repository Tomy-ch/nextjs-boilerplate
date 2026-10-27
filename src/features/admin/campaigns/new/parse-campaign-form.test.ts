import { describe, expect, it } from "vitest";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import {
  COUPON_DISCOUNT_FORM_NAMES,
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
} from "../../coupon-discount";
import { COUPON_SCOPE_FORM_NAMES, COUPON_SCOPE_KIND_MISSING_MESSAGE } from "../../coupon-scope";
import {
  CAMPAIGN_CODE_INVALID_MESSAGE,
  CAMPAIGN_ENDS_BEFORE_START_MESSAGE,
  CAMPAIGN_LIMIT_INVALID_MESSAGE,
} from "./campaign-rules";
import { CAMPAIGN_CONFIRMED_VALUE, CAMPAIGN_FORM_NAMES } from "./form-names";
import { CAMPAIGN_TARGET_LOST_MESSAGE } from "./form-state";
import { parseCampaignForm } from "./parse-campaign-form";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";
const PRODUCT_ID = "0195f0c2-0000-7000-8000-000000000021";

const NAMES = [
  ["code", CAMPAIGN_FORM_NAMES.code],
  ["startsAt", CAMPAIGN_FORM_NAMES.startsAt],
  ["endsAt", CAMPAIGN_FORM_NAMES.endsAt],
  ["couponExpiresAt", CAMPAIGN_FORM_NAMES.couponExpiresAt],
  ["usableFrom", CAMPAIGN_FORM_NAMES.usableFrom],
  ["totalLimit", CAMPAIGN_FORM_NAMES.totalLimit],
  ["perUserLimit", CAMPAIGN_FORM_NAMES.perUserLimit],
  ["minPurchaseAmount", CAMPAIGN_FORM_NAMES.minPurchaseAmount],
  ["confirmed", CAMPAIGN_FORM_NAMES.confirmed],
  ["idempotencyKey", IDEMPOTENCY_KEY_FIELD],
  ["discountKind", COUPON_DISCOUNT_FORM_NAMES.kind],
  ["discountValue", COUPON_DISCOUNT_FORM_NAMES.value],
  ["discountMaxAmount", COUPON_DISCOUNT_FORM_NAMES.maxAmount],
  ["scopeKind", COUPON_SCOPE_FORM_NAMES.kind],
  ["scopeCategoryId", COUPON_SCOPE_FORM_NAMES.categoryId],
  ["scopeProductId", COUPON_SCOPE_FORM_NAMES.productId],
] as const;

type CampaignFormValues = Readonly<Record<(typeof NAMES)[number][0], string | null>>;

/** 送信の 1 件を組む。null を渡した項目は「届かなかった」ことを表す。 */
function formData(overrides: Partial<CampaignFormValues> = {}): FormData {
  const values: CampaignFormValues = {
    code: " summer-2026 ",
    startsAt: "2026-10-01T01:00:00.000Z",
    endsAt: "2026-10-31T15:00:00.000Z",
    couponExpiresAt: "2026-11-30T15:00:00.000Z",
    usableFrom: "2026-10-05T00:00:00.000Z",
    totalLimit: "100",
    perUserLimit: "2",
    minPurchaseAmount: "50",
    confirmed: CAMPAIGN_CONFIRMED_VALUE,
    idempotencyKey: IDEMPOTENCY_KEY,
    discountKind: "rate",
    discountValue: "10",
    discountMaxAmount: "20",
    scopeKind: "product",
    scopeCategoryId: null,
    scopeProductId: PRODUCT_ID,
    ...overrides,
  };
  const data = new FormData();

  for (const [field, name] of NAMES) {
    const value = values[field];

    if (value !== null) data.append(name, value);
  }

  return data;
}

describe("parseCampaignForm", () => {
  // ----- 正常系 -----
  it("揃った送信を、定義する内容と冪等キーとして読む", () => {
    expect(parseCampaignForm(formData())).toStrictEqual({
      ok: true,
      draft: {
        code: "SUMMER-2026",
        discount: { kind: "rate", value: "0.10", maxAmount: 2000 },
        scope: { kind: "product", productId: PRODUCT_ID },
        minPurchaseAmount: 5000,
        usableFrom: new Date("2026-10-05T00:00:00.000Z"),
        couponExpiresAt: new Date("2026-11-30T15:00:00.000Z"),
        startsAt: new Date("2026-10-01T01:00:00.000Z"),
        endsAt: new Date("2026-10-31T15:00:00.000Z"),
        totalLimit: 100,
        perUserLimit: 2,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
    });
  });

  it("時差付きで届いた日時は、時間帯を解き直さずにその瞬間として読む", () => {
    const parsed = parseCampaignForm(formData({ startsAt: "2026-10-01T10:00:00+09:00" }));

    expect(parsed.ok && parsed.draft.startsAt).toStrictEqual(new Date("2026-10-01T01:00:00.000Z"));
  });

  it.each<{ label: string; overrides: Partial<CampaignFormValues> }>([
    { label: "届かない", overrides: { usableFrom: null, minPurchaseAmount: null } },
    { label: "空", overrides: { usableFrom: "", minPurchaseAmount: "" } },
  ])("任意の利用開始と最低購入額が$label送信は、条件無しの null として読む", ({ overrides }) => {
    const parsed = parseCampaignForm(formData(overrides));

    expect(parsed.ok && parsed.draft.usableFrom).toBeNull();
    expect(parsed.ok && parsed.draft.minPurchaseAmount).toBeNull();
  });

  it("値引きと範囲は、それぞれの共有の欄名で届いた値から読む", () => {
    const parsed = parseCampaignForm(
      formData({
        discountKind: "flat",
        discountValue: "5",
        discountMaxAmount: null,
        scopeKind: "all",
      }),
    );

    expect(parsed.ok && parsed.draft.discount).toStrictEqual({ kind: "flat", value: "5" });
    expect(parsed.ok && parsed.draft.scope).toStrictEqual({ kind: "all" });
  });

  // ----- 異常系 -----
  it.each<{ label: string; overrides: Partial<CampaignFormValues> }>([
    { label: "冪等キーが届かない", overrides: { idempotencyKey: null } },
    { label: "冪等キーが UUID でない", overrides: { idempotencyKey: "not-a-uuid" } },
    { label: "確認の合図が届かない", overrides: { confirmed: null } },
    { label: "確認の合図が別の値", overrides: { confirmed: "false" } },
  ])("$label送信は、欄の誤りではなく開き直す案内を返す", ({ overrides }) => {
    expect(parseCampaignForm(formData(overrides))).toStrictEqual({
      ok: false,
      formError: CAMPAIGN_TARGET_LOST_MESSAGE,
    });
  });

  it("確認の合図が無ければ、欄が読めなくても開き直す案内を先に返す", () => {
    expect(parseCampaignForm(formData({ confirmed: null, totalLimit: "abc" }))).toStrictEqual({
      ok: false,
      formError: CAMPAIGN_TARGET_LOST_MESSAGE,
    });
  });

  it("確認の合図がファイルで届けば、届かなかったものとして扱う", () => {
    const data = formData({ confirmed: null });

    data.append(
      CAMPAIGN_FORM_NAMES.confirmed,
      new File([CAMPAIGN_CONFIRMED_VALUE], "confirmed.txt"),
    );

    expect(parseCampaignForm(data)).toStrictEqual({
      ok: false,
      formError: CAMPAIGN_TARGET_LOST_MESSAGE,
    });
  });

  it("1 つの欄だけが読めなければ、その欄だけに文言の一覧を返す", () => {
    expect(parseCampaignForm(formData({ totalLimit: "0" }))).toStrictEqual({
      ok: false,
      formError: null,
      fieldErrors: { totalLimit: [CAMPAIGN_LIMIT_INVALID_MESSAGE] },
    });
  });

  it("配布終了が配布開始より後でなければ、配布終了の欄に文言を返す", () => {
    expect(parseCampaignForm(formData({ endsAt: "2026-10-01T01:00:00.000Z" }))).toStrictEqual({
      ok: false,
      formError: null,
      fieldErrors: { endsAt: [CAMPAIGN_ENDS_BEFORE_START_MESSAGE] },
    });
  });

  it("読めない欄が複数あれば、すべての欄に文言を返す", () => {
    expect(parseCampaignForm(formData({ code: "abc", perUserLimit: "-1" }))).toStrictEqual({
      ok: false,
      formError: null,
      fieldErrors: {
        code: [CAMPAIGN_CODE_INVALID_MESSAGE],
        perUserLimit: [CAMPAIGN_LIMIT_INVALID_MESSAGE],
      },
    });
  });

  it("値引きと範囲の種別が届かなければ、それぞれの種別の欄に文言を返す", () => {
    expect(parseCampaignForm(formData({ discountKind: null, scopeKind: null }))).toStrictEqual({
      ok: false,
      formError: null,
      fieldErrors: {
        discountKind: [COUPON_DISCOUNT_KIND_MISSING_MESSAGE],
        scopeKind: [COUPON_SCOPE_KIND_MISSING_MESSAGE],
      },
    });
  });
});

import { describe, expect, it } from "vitest";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import {
  COUPON_DISCOUNT_FORM_NAMES,
  COUPON_DISCOUNT_KIND_MISSING_MESSAGE,
} from "../../coupon-discount";
import { COUPON_SCOPE_FORM_NAMES } from "../../coupon-scope";
import { ISSUE_CONFIRMED_VALUE, ISSUE_FORM_NAMES } from "./form-names";
import { ISSUE_TARGET_LOST_MESSAGE } from "./form-state";
import {
  ISSUE_EXPIRES_AT_MISSING_MESSAGE,
  ISSUE_MIN_PURCHASE_INVALID_MESSAGE,
} from "./issue-rules";
import { parseIssueForm } from "./parse-issue-form";

const USER_ID = "0195f0c2-0000-7000-8000-000000000001";
const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-0000000000aa";
const CATEGORY_ID = "0195f0c2-0000-7000-8000-000000000011";

const NAMES = [
  ["userId", ISSUE_FORM_NAMES.userId],
  ["expiresAt", ISSUE_FORM_NAMES.expiresAt],
  ["usableFrom", ISSUE_FORM_NAMES.usableFrom],
  ["minPurchaseAmount", ISSUE_FORM_NAMES.minPurchaseAmount],
  ["confirmed", ISSUE_FORM_NAMES.confirmed],
  ["idempotencyKey", IDEMPOTENCY_KEY_FIELD],
  ["discountKind", COUPON_DISCOUNT_FORM_NAMES.kind],
  ["discountValue", COUPON_DISCOUNT_FORM_NAMES.value],
  ["discountMaxAmount", COUPON_DISCOUNT_FORM_NAMES.maxAmount],
  ["scopeKind", COUPON_SCOPE_FORM_NAMES.kind],
  ["scopeCategoryId", COUPON_SCOPE_FORM_NAMES.categoryId],
  ["scopeProductId", COUPON_SCOPE_FORM_NAMES.productId],
] as const;

type IssueFormValues = Readonly<Record<(typeof NAMES)[number][0], string | null>>;

function formData(overrides: Partial<IssueFormValues> = {}): FormData {
  const values: IssueFormValues = {
    userId: USER_ID,
    expiresAt: "2026-12-31T14:59:00.000Z",
    usableFrom: "2026-12-01T00:00:00.000Z",
    minPurchaseAmount: "50",
    confirmed: ISSUE_CONFIRMED_VALUE,
    idempotencyKey: IDEMPOTENCY_KEY,
    discountKind: "flat",
    discountValue: "5",
    discountMaxAmount: null,
    scopeKind: "category",
    scopeCategoryId: CATEGORY_ID,
    scopeProductId: null,
    ...overrides,
  };
  const data = new FormData();

  for (const [field, name] of NAMES) {
    const value = values[field];

    if (value !== null) data.append(name, value);
  }

  return data;
}

describe("parseIssueForm", () => {
  // ----- 正常系 -----
  it("揃った送信を、宛先と発行する内容と冪等キーとして読む", () => {
    expect(parseIssueForm(formData())).toStrictEqual({
      ok: true,
      recipient: USER_ID,
      draft: {
        discount: { kind: "flat", value: "5" },
        scope: { kind: "category", categoryId: CATEGORY_ID },
        expiresAt: new Date("2026-12-31T14:59:00.000Z"),
        usableFrom: new Date("2026-12-01T00:00:00.000Z"),
        minPurchaseAmount: 5000,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
    });
  });

  // ----- 異常系 -----
  it.each<{ label: string; overrides: Partial<IssueFormValues> }>([
    { label: "宛先が届かない", overrides: { userId: null } },
    { label: "宛先が UUID でない", overrides: { userId: "not-a-uuid" } },
  ])("$label送信は、宛先を持たずに開き直す案内を返す", ({ overrides }) => {
    expect(parseIssueForm(formData(overrides))).toStrictEqual({
      ok: false,
      recipient: null,
      formError: ISSUE_TARGET_LOST_MESSAGE,
    });
  });

  it.each<{ label: string; overrides: Partial<IssueFormValues> }>([
    { label: "冪等キーが届かない", overrides: { idempotencyKey: null } },
    { label: "冪等キーが UUID でない", overrides: { idempotencyKey: "not-a-uuid" } },
    { label: "確認の合図が届かない", overrides: { confirmed: null } },
    { label: "確認の合図が別の値", overrides: { confirmed: "false" } },
  ])("$label送信は、読めた宛先を添えて開き直す案内を返す", ({ overrides }) => {
    expect(parseIssueForm(formData(overrides))).toStrictEqual({
      ok: false,
      recipient: USER_ID,
      formError: ISSUE_TARGET_LOST_MESSAGE,
    });
  });

  it("確認の合図が無ければ、欄が読めなくても開き直す案内を先に返す", () => {
    expect(parseIssueForm(formData({ confirmed: null, expiresAt: "" }))).toStrictEqual({
      ok: false,
      recipient: USER_ID,
      formError: ISSUE_TARGET_LOST_MESSAGE,
    });
  });

  it("1 つの欄だけが読めなければ、宛先を添えてその欄だけに文言の一覧を返す", () => {
    expect(parseIssueForm(formData({ minPurchaseAmount: "0" }))).toStrictEqual({
      ok: false,
      recipient: USER_ID,
      formError: null,
      fieldErrors: { minPurchaseAmount: [ISSUE_MIN_PURCHASE_INVALID_MESSAGE] },
    });
  });

  it("読めない欄が複数あれば、すべての欄に文言を返す", () => {
    expect(parseIssueForm(formData({ expiresAt: null, discountKind: null }))).toStrictEqual({
      ok: false,
      recipient: USER_ID,
      formError: null,
      fieldErrors: {
        discountKind: [COUPON_DISCOUNT_KIND_MISSING_MESSAGE],
        expiresAt: [ISSUE_EXPIRES_AT_MISSING_MESSAGE],
      },
    });
  });

  it("有効期限がファイルで届けば、空として読み、有効期限の欄に文言を返す", () => {
    const data = formData({ expiresAt: null });

    data.append(ISSUE_FORM_NAMES.expiresAt, new File(["2026-12-31T14:59:00.000Z"], "expires.txt"));

    expect(parseIssueForm(data)).toStrictEqual({
      ok: false,
      recipient: USER_ID,
      formError: null,
      fieldErrors: { expiresAt: [ISSUE_EXPIRES_AT_MISSING_MESSAGE] },
    });
  });

  it("確認の合図がファイルで届けば、届かなかったものとして扱う", () => {
    const data = formData({ confirmed: null });

    data.append(ISSUE_FORM_NAMES.confirmed, new File([ISSUE_CONFIRMED_VALUE], "confirmed.txt"));

    expect(parseIssueForm(data)).toStrictEqual({
      ok: false,
      recipient: USER_ID,
      formError: ISSUE_TARGET_LOST_MESSAGE,
    });
  });
});

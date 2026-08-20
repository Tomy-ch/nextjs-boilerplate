import { describe, expect, it } from "vitest";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { parseRegistrationForm, RETURN_URL_FIELD } from "./parse-registration-form";

const IDEMPOTENCY_KEY = "0195f0c2-0000-7000-8000-00000000000f";

const FILLED = {
  lastName: "山田",
  firstName: "太郎",
  email: "taro.yamada@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "パークサイドレジデンス 1201",
};

function formDataOf(overrides: Record<string, string> = {}): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries({
    ...FILLED,
    [IDEMPOTENCY_KEY_FIELD]: IDEMPOTENCY_KEY,
    [RETURN_URL_FIELD]: "/mypage",
    ...overrides,
  })) {
    formData.set(name, value);
  }

  return formData;
}

describe("RETURN_URL_FIELD", () => {
  // ----- 正常系 -----
  it("戻り先を載せる項目の名前を持つ", () => {
    expect(RETURN_URL_FIELD).toBe("returnUrl");
  });
});

describe("parseRegistrationForm", () => {
  // ----- 正常系 -----
  it("入力と鍵と戻り先を、登録に渡せる形へ解く", () => {
    expect(parseRegistrationForm(formDataOf())).toEqual({
      status: "ok",
      profile: FILLED,
      idempotencyKey: IDEMPOTENCY_KEY,
      returnUrl: "/mypage",
    });
  });

  it("任意入力の空欄を、値ではなく入力しなかったこととして解く", () => {
    const result = parseRegistrationForm(formDataOf({ building: "" }));

    expect(result).toMatchObject({ status: "ok", profile: { building: null } });
  });

  it("外部の URL を戻り先に載せられても既定の行き先へ倒す", () => {
    const result = parseRegistrationForm(formDataOf({ [RETURN_URL_FIELD]: "https://evil.test" }));

    expect(result).toMatchObject({ status: "ok", returnUrl: "/" });
  });

  it("戻り先が載っていなくても解ける", () => {
    const formData = formDataOf();
    formData.delete(RETURN_URL_FIELD);

    expect(parseRegistrationForm(formData)).toMatchObject({ status: "ok", returnUrl: "/" });
  });

  // ----- 異常系 -----
  it("戻り先に文字列でない値が積まれていても既定の行き先へ倒す", () => {
    const formData = formDataOf();
    formData.set(RETURN_URL_FIELD, new File([], "returnUrl.txt"));

    expect(parseRegistrationForm(formData)).toMatchObject({ status: "ok", returnUrl: "/" });
  });

  it("入力の誤りは項目ごとに返す", () => {
    const result = parseRegistrationForm(formDataOf({ email: "not-an-email", city: "" }));

    expect(result).toEqual({
      status: "invalid-input",
      fieldErrors: {
        email: ["メールアドレスの形式が正しくありません。"],
        city: ["市区町村を入力してください。"],
      },
    });
  });

  it("鍵が載っていない送信は、利用者に直せない要求として分ける", () => {
    const formData = formDataOf();
    formData.delete(IDEMPOTENCY_KEY_FIELD);

    expect(parseRegistrationForm(formData)).toEqual({ status: "broken-request" });
  });

  it("鍵の形が違う送信も、利用者に直せない要求として分ける", () => {
    expect(parseRegistrationForm(formDataOf({ [IDEMPOTENCY_KEY_FIELD]: "not-a-uuid" }))).toEqual({
      status: "broken-request",
    });
  });

  it("鍵を先に見るので、入力の誤りより壊れた要求を優先して返す", () => {
    const result = parseRegistrationForm(
      formDataOf({ [IDEMPOTENCY_KEY_FIELD]: "not-a-uuid", email: "not-an-email" }),
    );

    expect(result).toEqual({ status: "broken-request" });
  });
});

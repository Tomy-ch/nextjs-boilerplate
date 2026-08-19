import { describe, expect, it } from "vitest";

import type { ProfileInput } from "@/model/user/profile-schema";

import { parseProfileForm } from "./parse-profile-form";

/** 全項目が規則を満たす入力。個別の項目だけを崩して用いる。 */
const VALID: ProfileInput = {
  firstName: "太郎",
  lastName: "山田",
  email: "taro@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "サンプルマンション 101",
};

/** 指定の項目だけを差し替えた `FormData` を組む。 */
function formDataOf(overrides: Partial<Record<string, string>> = {}): FormData {
  const formData = new FormData();

  for (const [name, value] of Object.entries({ ...VALID, ...overrides })) {
    formData.set(name, value);
  }

  return formData;
}

describe("parseProfileForm", () => {
  // ----- 正常系 -----
  it("全項目が規則を満たす入力を更新に渡せる形へ解く", () => {
    expect(parseProfileForm(formDataOf())).toEqual({ ok: true, profile: VALID });
  });

  it("空欄の建物名を、値の無い状態として null にする", () => {
    const result = parseProfileForm(formDataOf({ building: "" }));

    expect(result).toEqual({ ok: true, profile: { ...VALID, building: null } });
  });

  it("入力された建物名は空文字へ潰さずそのまま持つ", () => {
    const result = parseProfileForm(formDataOf({ building: "別館 2F" }));

    expect(result).toMatchObject({ ok: true, profile: { building: "別館 2F" } });
  });

  it("契約に無い項目が混ざっても落として解く", () => {
    const formData = formDataOf();

    formData.set("role", "admin");

    expect(parseProfileForm(formData)).toEqual({ ok: true, profile: VALID });
  });

  // ----- 異常系 -----
  it("規則を外れた項目の文言を項目名をキーにして返す", () => {
    const result = parseProfileForm(formDataOf({ email: "taro@" }));

    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: ["メールアドレスの形式が正しくありません。"] },
    });
  });

  it("複数の項目が外れたときすべての項目を返す", () => {
    const result = parseProfileForm(formDataOf({ email: "", phone: "" }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && Object.keys(result.fieldErrors)).toEqual(["email", "phone"]);
  });

  it("項目そのものが欠けているとき空欄と同じに扱って弾く", () => {
    const formData = formDataOf();

    formData.delete("lastName");

    expect(parseProfileForm(formData)).toMatchObject({
      ok: false,
      fieldErrors: { lastName: ["姓を入力してください。"] },
    });
  });

  it("文字列でない値が送られたとき空欄と同じに扱って弾く", () => {
    const formData = formDataOf();

    formData.set("city", new Blob(["渋谷区"]));

    expect(parseProfileForm(formData)).toMatchObject({
      ok: false,
      fieldErrors: { city: ["市区町村を入力してください。"] },
    });
  });

  it("弾いたとき解いた値を返さない", () => {
    const result = parseProfileForm(formDataOf({ email: "taro@" }));

    expect(result).not.toHaveProperty("profile");
  });
});

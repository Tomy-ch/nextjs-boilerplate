import { describe, expect, it } from "vitest";

import { isRequiredProfileField, type ProfileInput, profileSchema } from "./profile-schema";

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
  building: "",
};

/** 指定の項目だけを差し替えて検証し、その項目に付いた文言を返す。 */
function messagesFor(field: keyof ProfileInput, value: string): string[] {
  const result = profileSchema.safeParse({ ...VALID, [field]: value });

  return result.success
    ? []
    : result.error.issues.filter((issue) => issue.path[0] === field).map((issue) => issue.message);
}

describe("profileSchema", () => {
  // ----- 正常系 -----
  it("全項目が規則を満たす入力を通す", () => {
    expect(profileSchema.safeParse(VALID)).toMatchObject({ success: true });
  });

  it("建物名は空欄でも通す", () => {
    expect(messagesFor("building", "")).toEqual([]);
  });

  it("電話番号の国番号の + を受け付ける", () => {
    expect(messagesFor("phone", "+819012345678")).toEqual([]);
  });

  it.each([
    { field: "firstName", value: "あ".repeat(50) },
    { field: "email", value: `${"a".repeat(88)}@example.com` },
    { field: "street", value: "あ".repeat(200) },
  ] as const)("$field は上限ちょうどの長さを通す", ({ field, value }) => {
    expect(messagesFor(field, value)).toEqual([]);
  });

  // ----- 異常系 -----
  it.each([
    { field: "firstName", message: "名前を入力してください。" },
    { field: "lastName", message: "名字を入力してください。" },
    { field: "email", message: "メールアドレスを入力してください。" },
    { field: "phone", message: "電話番号を入力してください。" },
    { field: "postalCode", message: "郵便番号を入力してください。" },
    { field: "prefecture", message: "都道府県を選択してください。" },
    { field: "city", message: "市区町村を入力してください。" },
    { field: "street", message: "丁目・番地を入力してください。" },
  ] as const)("$field が空欄のとき項目名を主語にした文言を返す", ({ field, message }) => {
    expect(messagesFor(field, "")).toContain(message);
  });

  it.each([
    {
      field: "firstName",
      value: "あ".repeat(51),
      message: "名前は 50 文字以内で入力してください。",
    },
    {
      field: "lastName",
      value: "あ".repeat(51),
      message: "名字は 50 文字以内で入力してください。",
    },
    {
      field: "email",
      value: `${"a".repeat(89)}@example.com`,
      message: "メールアドレスは 100 文字以内で入力してください。",
    },
    {
      field: "prefecture",
      value: "あ".repeat(101),
      message: "都道府県は 100 文字以内で入力してください。",
    },
    {
      field: "city",
      value: "あ".repeat(101),
      message: "市区町村は 100 文字以内で入力してください。",
    },
    {
      field: "street",
      value: "あ".repeat(201),
      message: "丁目・番地は 200 文字以内で入力してください。",
    },
    {
      field: "building",
      value: "あ".repeat(201),
      message: "建物名は 200 文字以内で入力してください。",
    },
  ] as const)("$field が上限を 1 文字超えたとき弾く", ({ field, value, message }) => {
    expect(messagesFor(field, value)).toContain(message);
  });

  it("メールアドレスの形式が崩れているとき形式の文言を返す", () => {
    expect(messagesFor("email", "taro@")).toContain("メールアドレスの形式が正しくありません。");
  });

  it.each([
    { label: "ハイフンを含む", value: "090-1234-5678" },
    { label: "9 桁しかない", value: "090123456" },
    { label: "16 桁ある", value: "0901234567890123" },
  ] as const)("電話番号が$label とき桁の文言を返す", ({ value }) => {
    expect(messagesFor("phone", value)).toContain(
      "電話番号はハイフンなしの 10〜15 桁で入力してください。",
    );
  });

  it.each([
    { label: "ハイフンが無い", value: "1500001" },
    { label: "前半が 2 桁しかない", value: "15-0001" },
    { label: "数字以外を含む", value: "150-000a" },
  ] as const)("郵便番号の$label とき形式の文言を返す", ({ value }) => {
    expect(messagesFor("postalCode", value)).toContain(
      "郵便番号は 123-4567 の形式で入力してください。",
    );
  });
});

describe("isRequiredProfileField", () => {
  // ----- 正常系 -----
  it.each([
    { field: "firstName" },
    { field: "lastName" },
    { field: "email" },
    { field: "phone" },
    { field: "postalCode" },
    { field: "prefecture" },
    { field: "city" },
    { field: "street" },
  ] as const)("空欄を弾く $field を必須と判定する", ({ field }) => {
    expect(isRequiredProfileField(field)).toBe(true);
  });

  it("空欄を受け付ける建物名を任意と判定する", () => {
    expect(isRequiredProfileField("building")).toBe(false);
  });
});

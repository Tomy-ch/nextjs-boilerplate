import { describe, expect, it } from "vitest";

import {
  ADDRESS_FIELDS,
  BASICS_FIELDS,
  isStepComplete,
  REGISTRATION_FIELDS,
  STEP_IDS,
} from "./steps";

const FILLED = {
  lastName: "山田",
  firstName: "太郎",
  email: "taro.yamada@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "",
};

describe("STEP_IDS", () => {
  // ----- 正常系 -----
  it("尋ねる 2 段と確認の段を、進む順に並べる", () => {
    expect(STEP_IDS).toEqual(["basics", "address", "confirm"]);
  });
});

describe("BASICS_FIELDS", () => {
  // ----- 正常系 -----
  it("名前と連絡先の 4 項目を尋ねる", () => {
    expect(BASICS_FIELDS).toEqual(["lastName", "firstName", "email", "phone"]);
  });
});

describe("ADDRESS_FIELDS", () => {
  // ----- 正常系 -----
  it("郵便番号から建物名までの 5 項目を尋ねる", () => {
    expect(ADDRESS_FIELDS).toEqual(["postalCode", "prefecture", "city", "street", "building"]);
  });
});

describe("REGISTRATION_FIELDS", () => {
  // ----- 正常系 -----
  it("段ごとの一覧を尋ねる順に連ねる", () => {
    expect(REGISTRATION_FIELDS).toEqual([...BASICS_FIELDS, ...ADDRESS_FIELDS]);
  });
});

describe("isStepComplete", () => {
  // ----- 正常系 -----
  it("その段の項目がすべて通れば終えられると判定する", () => {
    expect(isStepComplete(FILLED, BASICS_FIELDS)).toBe(true);
  });

  it("任意入力が空でも終えられると判定する", () => {
    expect(isStepComplete({ ...FILLED, building: "" }, ADDRESS_FIELDS)).toBe(true);
  });

  it("他の段の項目が欠けていても、その段の判定には効かない", () => {
    expect(
      isStepComplete(
        { lastName: "山田", firstName: "太郎", email: "a@example.com", phone: "09012345678" },
        BASICS_FIELDS,
      ),
    ).toBe(true);
  });

  // ----- 異常系 -----
  it("触れていない項目は欠けているものとして扱う", () => {
    expect(isStepComplete({}, BASICS_FIELDS)).toBe(false);
  });

  it("空欄を残した段は終えられないと判定する", () => {
    expect(isStepComplete({ ...FILLED, city: "" }, ADDRESS_FIELDS)).toBe(false);
  });

  it("形式を外れた値も欠けと同じく終えられないと判定する", () => {
    expect(isStepComplete({ ...FILLED, email: "not-an-email" }, BASICS_FIELDS)).toBe(false);
  });
});

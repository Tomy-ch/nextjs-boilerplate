import { describe, expect, it } from "vitest";

import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

import { CLAIM_CODE_FIELD } from "./form-names";
import { parseClaimCouponForm } from "./parse-claim-form";

const KEY = "00000000-0000-4000-8000-000000000001";

const EMPTY_CODE_MESSAGE = "キャンペーンコードを入力してください。";

function formOf(entries: { code?: string | File; key?: string }): FormData {
  const formData = new FormData();

  if (entries.code !== undefined) {
    formData.set(CLAIM_CODE_FIELD, entries.code);
  }

  if (entries.key !== undefined) {
    formData.set(IDEMPOTENCY_KEY_FIELD, entries.key);
  }

  return formData;
}

describe("parseClaimCouponForm", () => {
  // ----- 正常系 -----
  it("コードと冪等キーを取り出す", () => {
    expect(parseClaimCouponForm(formOf({ code: "SPRING", key: KEY }))).toEqual({
      ok: true,
      code: "SPRING",
      idempotencyKey: KEY,
    });
  });

  it("コードの空白と大文字・小文字を書き換えずに渡す", () => {
    expect(parseClaimCouponForm(formOf({ code: "  Abc ", key: KEY }))).toMatchObject({
      ok: true,
      code: "  Abc ",
    });
  });

  // ----- 異常系 -----
  it.each([
    ["空", ""],
    ["空白だけ", "   "],
  ])("コードが%sなら、入力を促す文言を返す", (_label, code) => {
    expect(parseClaimCouponForm(formOf({ code, key: KEY }))).toEqual({
      ok: false,
      reason: "field",
      codeError: EMPTY_CODE_MESSAGE,
    });
  });

  it("コードの項目が無ければ、入力を促す文言を返す", () => {
    expect(parseClaimCouponForm(formOf({ key: KEY }))).toEqual({
      ok: false,
      reason: "field",
      codeError: EMPTY_CODE_MESSAGE,
    });
  });

  it("コードが文字列でなければ、入力を促す文言を返す", () => {
    const file = new File(["SPRING"], "code.txt");

    expect(parseClaimCouponForm(formOf({ code: file, key: KEY }))).toEqual({
      ok: false,
      reason: "field",
      codeError: EMPTY_CODE_MESSAGE,
    });
  });

  it("冪等キーが無ければ、項目に紐づかない失敗にする", () => {
    expect(parseClaimCouponForm(formOf({ code: "SPRING" }))).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });

  it("冪等キーが uuid でなければ、項目に紐づかない失敗にする", () => {
    expect(parseClaimCouponForm(formOf({ code: "SPRING", key: "broken" }))).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });

  it("冪等キーが解けなければ、コードが空でも入力を促さない", () => {
    expect(parseClaimCouponForm(formOf({ code: "", key: "broken" }))).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });
});

import { describe, expect, it } from "vitest";

import { fieldControlAttributes, toDescriptionId, toErrorId } from "./field-attributes";

const CONTROL_ID = "profile-email";
const ERROR_ID = "profile-email-error";
const DESCRIPTION_ID = "profile-email-description";

describe("fieldControlAttributes", () => {
  // ----- 正常系 -----
  it("入力欄と文言を結ぶ id を配る", () => {
    const attributes = fieldControlAttributes({
      controlId: CONTROL_ID,
      errorId: ERROR_ID,
      message: undefined,
      required: true,
    });

    expect(attributes.id).toBe(CONTROL_ID);
    expect(attributes["aria-required"]).toBe(true);
  });

  it("誤りが無ければ文言を指さず、不正でもないと伝える", () => {
    const attributes = fieldControlAttributes({
      controlId: CONTROL_ID,
      errorId: ERROR_ID,
      message: undefined,
      required: false,
    });

    expect(attributes["aria-describedby"]).toBeUndefined();
    expect(attributes["aria-invalid"]).toBe(false);
    expect(attributes["aria-required"]).toBe(false);
  });

  it("補足があればその在処を伝える", () => {
    const attributes = fieldControlAttributes({
      controlId: CONTROL_ID,
      description: "連絡のための宛先です。",
      errorId: ERROR_ID,
      message: undefined,
      required: true,
    });

    expect(attributes["aria-describedby"]).toBe(DESCRIPTION_ID);
  });

  it("補足と誤りの両方があれば、描画される順で並べる", () => {
    const attributes = fieldControlAttributes({
      controlId: CONTROL_ID,
      description: "連絡のための宛先です。",
      errorId: ERROR_ID,
      message: "メールアドレスを入力してください。",
      required: true,
    });

    expect(attributes["aria-describedby"]).toBe(`${DESCRIPTION_ID} ${ERROR_ID}`);
  });

  // ----- 異常系 -----
  it("誤りがあれば不正であることと文言の在処を伝える", () => {
    const attributes = fieldControlAttributes({
      controlId: CONTROL_ID,
      errorId: ERROR_ID,
      message: "メールアドレスを入力してください。",
      required: true,
    });

    expect(attributes["aria-invalid"]).toBe(true);
    expect(attributes["aria-describedby"]).toBe(ERROR_ID);
  });
});

describe("toDescriptionId", () => {
  // ----- 正常系 -----
  it("入力欄の id から、補足の id を導く", () => {
    expect(toDescriptionId(CONTROL_ID)).toBe(DESCRIPTION_ID);
  });
});

describe("toErrorId", () => {
  // ----- 正常系 -----
  it("入力欄の id から、誤りの文言の id を導く", () => {
    expect(toErrorId(CONTROL_ID)).toBe(ERROR_ID);
  });
});

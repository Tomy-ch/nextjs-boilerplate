import { describe, expect, it } from "vitest";

import {
  allowsCategory,
  CONSENT_CATEGORY,
  CONSENT_CHOICE,
  CONSENT_COPY_VERSION,
  parseConsentState,
  shouldAskConsent,
  toConsentCookieValue,
  UNREAD_CONSENT,
} from "./consent";

describe("parseConsentState", () => {
  // ----- 正常系 -----
  it("同意の綴りを、任意の用途を許した意思として読む", () => {
    expect(parseConsentState(toConsentCookieValue(CONSENT_CHOICE.granted))).toEqual({
      status: "decided",
      optional: CONSENT_CHOICE.granted,
    });
  });

  it("拒否の綴りを、任意の用途を許さない意思として読む", () => {
    expect(parseConsentState(toConsentCookieValue(CONSENT_CHOICE.denied))).toEqual({
      status: "decided",
      optional: CONSENT_CHOICE.denied,
    });
  });

  it("cookie が無ければ、まだ選ばれていないものとして読む", () => {
    expect(parseConsentState(undefined)).toEqual({ status: "unset" });
  });

  // ----- 異常系 -----
  it("知らない綴りは、意思として読まずに未選択へ倒す", () => {
    expect(parseConsentState(`all.${CONSENT_COPY_VERSION}`)).toEqual({ status: "unset" });
  });

  it("尋ねた文面の版が違えば、意思として読まない", () => {
    const older = `${CONSENT_CHOICE.granted}.${CONSENT_COPY_VERSION - 1}`;

    expect(parseConsentState(older)).toEqual({ status: "unset" });
  });

  it("版を持たない綴りも読まない。文面を尋ねる前の形である", () => {
    expect(parseConsentState(CONSENT_CHOICE.granted)).toEqual({ status: "unset" });
  });

  it("空の値も未選択へ倒す", () => {
    expect(parseConsentState("")).toEqual({ status: "unset" });
  });
});

describe("toConsentCookieValue", () => {
  // ----- 正常系 -----
  it("意思に、尋ねた文面の版を添える", () => {
    expect(toConsentCookieValue(CONSENT_CHOICE.granted)).toBe(
      `${CONSENT_CHOICE.granted}.${CONSENT_COPY_VERSION}`,
    );
  });

  it("綴った値は読み戻せる", () => {
    expect(parseConsentState(toConsentCookieValue(CONSENT_CHOICE.denied))).toEqual({
      status: "decided",
      optional: CONSENT_CHOICE.denied,
    });
  });
});

describe("allowsCategory", () => {
  // ----- 正常系 -----
  it("必要な用途は、まだ読んでいなくても動かしてよい", () => {
    expect(allowsCategory(UNREAD_CONSENT, CONSENT_CATEGORY.necessary)).toBe(true);
  });

  it("任意の用途は、同意が得られていれば動かしてよい", () => {
    const granted = parseConsentState(CONSENT_CHOICE.granted);

    expect(allowsCategory(granted, CONSENT_CATEGORY.optional)).toBe(true);
  });

  // ----- 異常系 -----
  it("任意の用途は、まだ読んでいない間は動かさない", () => {
    expect(allowsCategory(UNREAD_CONSENT, CONSENT_CATEGORY.optional)).toBe(false);
  });

  it("任意の用途は、読んだが選ばれていない間も動かさない", () => {
    expect(allowsCategory(parseConsentState(undefined), CONSENT_CATEGORY.optional)).toBe(false);
  });

  it("任意の用途は、拒否されていれば動かさない", () => {
    const denied = parseConsentState(CONSENT_CHOICE.denied);

    expect(allowsCategory(denied, CONSENT_CATEGORY.optional)).toBe(false);
  });
});

describe("shouldAskConsent", () => {
  // ----- 正常系 -----
  it("読んだうえで選ばれていなければ尋ねる", () => {
    expect(shouldAskConsent(parseConsentState(undefined))).toBe(true);
  });

  it("選び終えていれば尋ねない", () => {
    expect(shouldAskConsent(parseConsentState(CONSENT_CHOICE.denied))).toBe(false);
  });

  // ----- 異常系 -----
  it("まだ読んでいない間は尋ねない", () => {
    expect(shouldAskConsent(UNREAD_CONSENT)).toBe(false);
  });
});

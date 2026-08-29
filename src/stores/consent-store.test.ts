// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CONSENT_CHOICE,
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  toConsentCookieValue,
} from "@/model/consent";

/**
 * cookie を置いた状態で store を読み込み直す。
 *
 * @remarks
 * 読み込み時に一度だけ cookie を読む作りなので、初期状態を変えるには module ごと作り直す。
 */
async function loadStore(cookie?: string) {
  if (cookie !== undefined) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${cookie}; path=/`;
  }

  vi.resetModules();

  return import("./consent-store");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.cookie = `${CONSENT_COOKIE_NAME}=; max-age=0; path=/`;
});

describe("useConsentState", () => {
  // ----- 正常系 -----
  it("cookie が無ければ、読んだうえで選ばれていない状態を配る", async () => {
    const { useConsentState } = await loadStore();

    const { result } = renderHook(() => useConsentState());

    expect(result.current).toEqual({ status: "unset" });
  });

  it("cookie に載った意思をそのまま配る", async () => {
    const { useConsentState } = await loadStore(toConsentCookieValue(CONSENT_CHOICE.granted));

    const { result } = renderHook(() => useConsentState());

    expect(result.current).toEqual({ status: "decided", optional: CONSENT_CHOICE.granted });
  });

  it("選ばれた意思を、購読している側へその場で伝える", async () => {
    const { decideConsent, useConsentState } = await loadStore();
    const { result } = renderHook(() => useConsentState());

    act(() => decideConsent(CONSENT_CHOICE.denied));

    expect(result.current).toEqual({ status: "decided", optional: CONSENT_CHOICE.denied });
  });

  it("cookie を読めないサーバ側では、まだ読んでいない状態を配る", async () => {
    vi.stubGlobal("document", undefined);
    const { useConsentState } = await loadStore();
    vi.unstubAllGlobals();

    const { result } = renderHook(() => useConsentState());

    expect(result.current).toEqual({ status: "unread" });
  });

  // ----- 異常系 -----
  it("読めない綴りが載っていても、意思として扱わない", async () => {
    const { useConsentState } = await loadStore("all");

    const { result } = renderHook(() => useConsentState());

    expect(result.current).toEqual({ status: "unset" });
  });
});

describe("decideConsent", () => {
  // ----- 正常系 -----
  it("選ばれた意思を cookie へ残す", async () => {
    const { decideConsent } = await loadStore();

    decideConsent(CONSENT_CHOICE.granted);

    expect(document.cookie).toContain(
      `${CONSENT_COOKIE_NAME}=${toConsentCookieValue(CONSENT_CHOICE.granted)}`,
    );
  });

  it("期限を付けて残す。無期限にはしない", async () => {
    const { decideConsent } = await loadStore();
    const written: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((value) => written.push(value));

    decideConsent(CONSENT_CHOICE.granted);
    vi.restoreAllMocks();

    expect(written[0]).toContain(`max-age=${CONSENT_MAX_AGE_SECONDS}`);
  });

  it("https で配信されていない間は secure を付けない。付けると手元で保存されない", async () => {
    const { decideConsent } = await loadStore();
    const written: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((value) => written.push(value));

    decideConsent(CONSENT_CHOICE.granted);
    vi.restoreAllMocks();

    expect(written[0]).not.toContain("secure");
  });

  it("https で配信されている間は secure を付ける", async () => {
    const { decideConsent } = await loadStore();
    const written: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((value) => written.push(value));
    vi.stubGlobal("location", { protocol: "https:" });

    decideConsent(CONSENT_CHOICE.granted);
    vi.restoreAllMocks();

    expect(written[0]).toContain("secure");
  });
});

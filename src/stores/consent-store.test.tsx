// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
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
 * cookie を読むのは mount 後の 1 回だけなので、初期状態を変えるには module ごと作り直す。
 */
async function loadStore(cookie?: string) {
  if (cookie !== undefined) {
    document.cookie = `${CONSENT_COOKIE_NAME}=${cookie}; path=/`;
  }

  vi.resetModules();

  return import("./consent-store");
}

/**
 * 暇になった瞬間まで進める。
 *
 * @remarks
 * cookie を読むのはそこからなので、読んだ後を見るケースは必ずこれを挟む。
 */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve));
  });
}

/** 状態を綴りとして出すだけの読み手。サーバ側スナップショットを見るために使う。 */
function Probe({ use }: { use: () => { status: string } }) {
  return <span>{use().status}</span>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.cookie = `${CONSENT_COOKIE_NAME}=; max-age=0; path=/`;
});

describe("useConsentState", () => {
  // ----- 正常系 -----
  it("mount しただけでは読まない。暇になるまで待つ", async () => {
    const { useConsentState } = await loadStore(toConsentCookieValue(CONSENT_CHOICE.granted));

    const { result } = renderHook(() => useConsentState());

    expect(result.current).toEqual({ status: "unread" });
  });

  it("cookie が無ければ、読んだうえで選ばれていない状態を配る", async () => {
    const { useConsentState } = await loadStore();

    const { result } = renderHook(() => useConsentState());
    await settle();

    expect(result.current).toEqual({ status: "unset" });
  });

  it("cookie に載った意思をそのまま配る", async () => {
    const { useConsentState } = await loadStore(toConsentCookieValue(CONSENT_CHOICE.granted));

    const { result } = renderHook(() => useConsentState());
    await settle();

    expect(result.current).toEqual({ status: "decided", optional: CONSENT_CHOICE.granted });
  });

  it("選ばれた意思を、購読している側へその場で伝える", async () => {
    const { decideConsent, useConsentState } = await loadStore();
    const { result } = renderHook(() => useConsentState());

    act(() => decideConsent(CONSENT_CHOICE.denied));

    expect(result.current).toEqual({ status: "decided", optional: CONSENT_CHOICE.denied });
  });

  it("cookie を読めないサーバ側では、まだ読んでいない状態を配る", async () => {
    const { useConsentState } = await loadStore(toConsentCookieValue(CONSENT_CHOICE.granted));

    expect(renderToStaticMarkup(<Probe use={useConsentState} />)).toContain("unread");
  });

  it("二度目の mount では読み直さない。読み終えた値をそのまま配る", async () => {
    const { useConsentState } = await loadStore();
    renderHook(() => useConsentState());
    await settle();

    document.cookie = `${CONSENT_COOKIE_NAME}=${toConsentCookieValue(CONSENT_CHOICE.granted)}; path=/`;
    const { result } = renderHook(() => useConsentState());
    await settle();

    expect(result.current).toEqual({ status: "unset" });
  });

  it("読み終えたあとのサーバ側スナップショットは、読んだ値を返す", async () => {
    const { useConsentState } = await loadStore(toConsentCookieValue(CONSENT_CHOICE.granted));
    renderHook(() => useConsentState());
    await settle();

    expect(renderToStaticMarkup(<Probe use={useConsentState} />)).toContain("decided");
  });

  // ----- 異常系 -----
  it("読めない綴りが載っていても、意思として扱わない", async () => {
    const { useConsentState } = await loadStore("all");

    const { result } = renderHook(() => useConsentState());
    await settle();

    expect(result.current).toEqual({ status: "unset" });
  });

  it("暇になる前に離れたら、そのまま読まない", async () => {
    const { useConsentState } = await loadStore(toConsentCookieValue(CONSENT_CHOICE.granted));

    renderHook(() => useConsentState()).unmount();
    await settle();

    expect(renderToStaticMarkup(<Probe use={useConsentState} />)).toContain("unread");
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

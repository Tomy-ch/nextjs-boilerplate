import { afterEach, describe, expect, it, vi } from "vitest";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { fetchPurchaseHistoryPage } from "./purchases";

const entry = {
  code: "0195f0c2-0000-7000-9000-000000000001",
  totalAmount: 21_287,
  statusCode: 1,
  statusName: "未処理",
  orderedAt: "2026-08-17T10:30:00+09:00",
};

const payload = { items: [entry], nextCursor: "next" };

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPurchaseHistoryPage", () => {
  // ----- 正常系 -----
  it("同一オリジンの口へ、渡された条件をそのまま載せる", async () => {
    const fetchImpl = stubFetch(200, payload);

    await fetchPurchaseHistoryPage(new URLSearchParams("period=recent&days=30&after=cursor"));

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/purchases?period=recent&days=30&after=cursor");
  });

  it("注文日時を日付へ戻す", async () => {
    stubFetch(200, payload);

    const page = await fetchPurchaseHistoryPage(new URLSearchParams());

    expect(page.items[0]?.orderedAt).toBeInstanceOf(Date);
    expect(page.items[0]?.orderedAt.toISOString()).toBe("2026-08-17T01:30:00.000Z");
  });

  it("次の鍵が無い応答をそのまま伝える", async () => {
    stubFetch(200, { items: [], nextCursor: null });

    await expect(fetchPurchaseHistoryPage(new URLSearchParams())).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("打ち切りの合図を取得へ渡す", async () => {
    const fetchImpl = stubFetch(200, payload);
    const controller = new AbortController();

    await fetchPurchaseHistoryPage(new URLSearchParams(), controller.signal);

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });

  // ----- 異常系 -----
  it("条件が悪い応答は、入力の問題として分類する", async () => {
    stubFetch(400, { message: "不正な条件です" });

    await expect(kindOf(() => fetchPurchaseHistoryPage(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
  });

  it("資格情報切れを内部の失敗へ畳まない", async () => {
    stubFetch(401, { message: "認証が必要です。" });

    await expect(kindOf(() => fetchPurchaseHistoryPage(new URLSearchParams()))).resolves.toBe(
      ErrorKind.UNAUTHENTICATED,
    );
  });

  it("それ以外の失敗は internal として分類する", async () => {
    stubFetch(503, { message: "利用できません" });

    await expect(kindOf(() => fetchPurchaseHistoryPage(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INTERNAL,
    );
  });

  it("形の違う応答を検証せずに通さない", async () => {
    stubFetch(200, { items: [{ ...entry, totalAmount: "21287" }], nextCursor: null });

    await expect(kindOf(() => fetchPurchaseHistoryPage(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INTERNAL,
    );
  });
});

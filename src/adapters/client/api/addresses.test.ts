import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAddressCandidates } from "./addresses";

const candidate = { prefecture: "東京都", city: "渋谷区", town: "神宮前" };

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAddressCandidates", () => {
  // ----- 正常系 -----
  it("BFF が返した候補をそのまま渡す", async () => {
    stubFetch(200, { candidates: [candidate] });

    await expect(fetchAddressCandidates("150-0001")).resolves.toEqual([candidate]);
  });

  it("郵便番号をクエリへ載せて同一オリジンの口を叩く", async () => {
    const fetchImpl = stubFetch(200, { candidates: [] });

    await fetchAddressCandidates("150-0001");

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/addresses?postalCode=150-0001");
  });

  it("クエリに載せる前に URL として安全な形へ変換する", async () => {
    const fetchImpl = stubFetch(200, { candidates: [] });

    await fetchAddressCandidates("150 0001&x=1");

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/addresses?postalCode=150%200001%26x%3D1");
  });

  it("打ち切りの signal をそのまま fetch へ渡す", async () => {
    const fetchImpl = stubFetch(200, { candidates: [] });
    const controller = new AbortController();

    await fetchAddressCandidates("150-0001", controller.signal);

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });

  it("該当が無いとき空の候補を返す", async () => {
    stubFetch(200, { candidates: [] });

    await expect(fetchAddressCandidates("999-9999")).resolves.toEqual([]);
  });

  // ----- 異常系 -----
  it("BFF が失敗を返したとき投げずに空の候補を返す", async () => {
    stubFetch(500, { message: "問題が発生しました。" });

    await expect(fetchAddressCandidates("150-0001")).resolves.toEqual([]);
  });

  it("応答が想定の形でないとき投げずに空の候補を返す", async () => {
    stubFetch(200, { candidates: [{ prefecture: "東京都" }] });

    await expect(fetchAddressCandidates("150-0001")).resolves.toEqual([]);
  });

  it("応答が JSON として読めないとき投げずに空の候補を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => new Response("<html>", { status: 200 })),
    );

    await expect(fetchAddressCandidates("150-0001")).resolves.toEqual([]);
  });

  it("通信そのものが失敗したとき投げずに空の候補を返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(fetchAddressCandidates("150-0001")).resolves.toEqual([]);
  });

  it("入力が続いて打ち切られたとき投げずに空の候補を返す", async () => {
    const controller = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        controller.abort();
        throw controller.signal.reason;
      }),
    );

    await expect(fetchAddressCandidates("150-0001", controller.signal)).resolves.toEqual([]);
  });
});

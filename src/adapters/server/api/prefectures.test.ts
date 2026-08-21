import { afterEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getPrefectures, PREFECTURE_MASTERS_TAG } from "./prefectures";

const wirePrefectures = [
  { id: "0195f0c2-0000-7000-8000-000000000001", code: 1, name: "北海道" },
  { id: "0195f0c2-0000-7000-8000-000000000013", code: 13, name: "東京都" },
];

function stubFetch(body: unknown): ReturnType<typeof vi.fn> {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPrefectures", () => {
  // ----- 正常系 -----
  it("契約の応答から ID と表示名だけを取り出す", async () => {
    stubFetch(wirePrefectures);

    await expect(getPrefectures()).resolves.toEqual([
      { id: wirePrefectures[0]?.id, name: "北海道" },
      { id: wirePrefectures[1]?.id, name: "東京都" },
    ]);
  });

  it("並び順を決めるだけの JIS コードを落とす", async () => {
    stubFetch(wirePrefectures);

    const [prefecture] = await getPrefectures();

    expect(prefecture).not.toHaveProperty("code");
  });

  it("契約が返した並びをそのまま保つ", async () => {
    stubFetch([...wirePrefectures].reverse());

    const prefectures = await getPrefectures();

    expect(prefectures.map(({ name }) => name)).toEqual(["東京都", "北海道"]);
  });

  it("再検証のタグを付ける", async () => {
    const fetchImpl = stubFetch(wirePrefectures);

    await getPrefectures();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      next: { tags: [PREFECTURE_MASTERS_TAG] },
    });
  });

  it("画面を開くたびに取り直さないようキャッシュを指定する", async () => {
    const fetchImpl = stubFetch(wirePrefectures);

    await getPrefectures();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ cache: "force-cache" });
  });

  it("認証ヘッダを付けずに送る", async () => {
    const fetchImpl = stubFetch(wirePrefectures);

    await getPrefectures();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ headers: {} });
  });

  it("マスタが空でも空の一覧として返す", async () => {
    stubFetch([]);

    await expect(getPrefectures()).resolves.toEqual([]);
  });
});

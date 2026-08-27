import { afterEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { serveJson, watchFetch } from "../../../../vitest.setup.msw";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getPrefectures, PREFECTURE_MASTERS_TAG } from "./prefectures";

const wirePrefectures = [
  { id: "0195f0c2-0000-7000-8000-000000000001", code: 1, name: "北海道" },
  { id: "0195f0c2-0000-7000-8000-000000000013", code: 13, name: "東京都" },
];

const PREFECTURES_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/prefectures`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getPrefectures", () => {
  // ----- 正常系 -----
  it("契約の応答から ID と表示名だけを取り出す", async () => {
    serveJson(PREFECTURES_URL, wirePrefectures);

    await expect(getPrefectures()).resolves.toEqual([
      { id: wirePrefectures[0]?.id, name: "北海道" },
      { id: wirePrefectures[1]?.id, name: "東京都" },
    ]);
  });

  it("並び順を決めるだけの JIS コードを落とす", async () => {
    serveJson(PREFECTURES_URL, wirePrefectures);

    const [prefecture] = await getPrefectures();

    expect(prefecture).not.toHaveProperty("code");
  });

  it("契約が返した並びをそのまま保つ", async () => {
    serveJson(PREFECTURES_URL, [...wirePrefectures].reverse());

    const prefectures = await getPrefectures();

    expect(prefectures.map(({ name }) => name)).toEqual(["東京都", "北海道"]);
  });

  it("再検証のタグを付ける", async () => {
    serveJson(PREFECTURES_URL, wirePrefectures);
    const fetchImpl = watchFetch();

    await getPrefectures();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      next: { tags: [PREFECTURE_MASTERS_TAG] },
    });
  });

  it("画面を開くたびに取り直さないようキャッシュを指定する", async () => {
    serveJson(PREFECTURES_URL, wirePrefectures);
    const fetchImpl = watchFetch();

    await getPrefectures();

    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ cache: "force-cache" });
  });

  it("認証ヘッダを付けずに送る", async () => {
    const requests = serveJson(PREFECTURES_URL, wirePrefectures);

    await getPrefectures();

    expect(requests[0]?.headers.get("authorization")).toBeNull();
  });

  it("マスタが空でも空の一覧として返す", async () => {
    serveJson(PREFECTURES_URL, []);

    await expect(getPrefectures()).resolves.toEqual([]);
  });
});

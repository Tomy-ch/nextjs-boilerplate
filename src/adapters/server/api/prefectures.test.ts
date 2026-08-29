import { afterEach, describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { serveJson, watchFetch } from "../../../../vitest.setup.msw";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));
const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

vi.mock("@/config/environment", () => ({ getEnvironment }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

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

  it("行政区画に合わせた最長の寿命と再検証タグを宣言する", async () => {
    serveJson(PREFECTURES_URL, wirePrefectures);

    await getPrefectures();

    expect(cacheLife).toHaveBeenCalledWith("max");
    expect(cacheTag).toHaveBeenCalledWith(PREFECTURE_MASTERS_TAG);
  });

  it("取得そのものには寿命を持たせない", async () => {
    serveJson(PREFECTURES_URL, wirePrefectures);
    const fetchImpl = watchFetch();

    await getPrefectures();

    expect(fetchImpl.mock.calls[0]?.[1]).not.toMatchObject({ cache: "force-cache" });
    expect(fetchImpl.mock.calls[0]?.[1]).not.toHaveProperty("next.tags");
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

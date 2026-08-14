import { afterEach, describe, expect, it, vi } from "vitest";
import type { Environment } from "@/config/environment";

const environment: Environment = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "none",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "none",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
};

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => environment) }));

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

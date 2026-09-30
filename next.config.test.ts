import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from "next/constants";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubValidEnvironment } from "./src/config/environment.fixture";

vi.mock("./src/config/load-environment", () => ({ loadEnvironment: vi.fn() }));

vi.mock("./src/config/security-headers/security-headers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./src/config/security-headers/security-headers")>();

  return { ...actual, buildSecurityHeaders: vi.fn(actual.buildSecurityHeaders) };
});

/** 読み直した設定を、指定した phase で解決する。 */
async function resolveConfig(phase: string = PHASE_PRODUCTION_BUILD) {
  const { default: nextConfig } = await import("./next.config");

  return nextConfig(phase);
}

/** 設定が組み立てたヘッダと、ヘッダの組み立てへ渡った引数。 */
async function resolveHeaders(phase: string = PHASE_PRODUCTION_BUILD) {
  const config = await resolveConfig(phase);
  const { buildSecurityHeaders } = await import(
    "./src/config/security-headers/security-headers"
  );
  const headers = await config.headers?.();

  return {
    headers,
    built: vi.mocked(buildSecurityHeaders).mock.results[0]?.value,
    inputs: vi.mocked(buildSecurityHeaders).mock.calls[0]?.[0],
  };
}

beforeEach(() => {
  vi.resetModules();
  stubValidEnvironment();
  vi.stubEnv("APP_ENV", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("nextConfig", () => {
  // ----- 正常系 -----
  it("開発専用の APP_ENV では、開発専用の拡張子を先に並べて route として扱う", async () => {
    vi.stubEnv("APP_ENV", "local");

    const config = await resolveConfig();

    expect(config.pageExtensions).toEqual(["dev.tsx", "dev.ts", "tsx", "ts"]);
  });

  it.each([
    { label: "本番の APP_ENV", appEnv: "prd" },
    { label: "APP_ENV の指定が無い", appEnv: undefined },
  ])("$label では、開発専用の拡張子を route として扱わない", async ({ appEnv }) => {
    vi.stubEnv("APP_ENV", appEnv);

    const config = await resolveConfig();

    expect(config.pageExtensions).toEqual(["tsx", "ts"]);
  });

  it("https の配信元は、ポートを持たない https の許可として載せる", async () => {
    vi.stubEnv("MEDIA_ORIGIN", "https://media.example.test");

    const config = await resolveConfig();

    expect(config.images?.remotePatterns).toEqual([
      { protocol: "https", hostname: "media.example.test", port: "", pathname: "/**" },
    ]);
  });

  it("http の配信元は、ポートごと http の許可として載せる", async () => {
    vi.stubEnv("MEDIA_ORIGIN", "http://localhost:9000");

    const config = await resolveConfig();

    expect(config.images?.remotePatterns).toEqual([
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    ]);
  });

  it("Server Action の本文の上限は、送れるファイルの上限に封筒のぶんを足した値になる", async () => {
    vi.stubEnv("NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES", "1000");

    const config = await resolveConfig();

    expect(config.experimental?.serverActions?.bodySizeLimit).toBe(1000 + 32 * 1024);
  });

  it("組み立てたセキュリティヘッダを、全経路へ 1 件の規則として載せる", async () => {
    const { headers, built } = await resolveHeaders();

    expect(headers).toEqual([{ source: "/:path*", headers: built }]);
  });

  it("ヘッダの組み立てへ、環境の値を対応する入力として渡す", async () => {
    vi.stubEnv("APP_API_BASE_URL", "https://api.wiring.test");
    vi.stubEnv("MEDIA_ORIGIN", "https://media.wiring.test");
    vi.stubEnv("AUTH_ISSUER", "https://issuer.wiring.test");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_GTM_CONTAINER_ID", "GTM-WIRING00");

    const { inputs } = await resolveHeaders();

    expect(inputs).toMatchObject({
      apiOrigin: "https://api.wiring.test",
      mediaOrigin: "https://media.wiring.test",
      authIssuer: "https://issuer.wiring.test",
      gtmContainerId: "GTM-WIRING00",
    });
  });

  it.each([
    { redirectUri: "https://app.example.test/auth/callback", expected: true },
    { redirectUri: "http://localhost:4000/auth/callback", expected: false },
  ])("callback URL が $redirectUri なら、https で配信しているかを $expected として渡す", async ({
    redirectUri,
    expected,
  }) => {
    vi.stubEnv("AUTH_REDIRECT_URI", redirectUri);

    const { inputs } = await resolveHeaders();

    expect(inputs?.servesOverTls).toBe(expected);
  });

  it.each([
    { phase: PHASE_DEVELOPMENT_SERVER, expected: true },
    { phase: PHASE_PRODUCTION_BUILD, expected: false },
  ])("$phase の phase では、開発用のヘッダかどうかを $expected として渡す", async ({
    phase,
    expected,
  }) => {
    const { inputs } = await resolveHeaders(phase);

    expect(inputs?.development).toBe(expected);
  });

  it("環境に依らない設定を固定の値で返す", async () => {
    const config = await resolveConfig();

    expect(config).toMatchObject({
      cacheComponents: true,
      reactCompiler: { compilationMode: "annotation" },
      poweredByHeader: false,
      agentRules: false,
      experimental: { taint: true },
    });
    expect(config.cacheLife?.["masters"]).toEqual({ stale: 300, revalidate: 86_400 });
  });

  it("ENV ファイルを読み込んでから検証するので、ファイルだけが持つ値も通る", async () => {
    vi.stubEnv("MEDIA_ORIGIN", undefined);
    const { loadEnvironment } = await import("./src/config/load-environment");
    vi.mocked(loadEnvironment).mockImplementation(() => {
      vi.stubEnv("MEDIA_ORIGIN", "https://from-file.example.test");
    });

    const config = await resolveConfig();

    expect(config.images?.remotePatterns?.[0]).toMatchObject({
      hostname: "from-file.example.test",
    });
  });

  // ----- 異常系 -----
  it("検証を通らない ENV では、欠けた変数を名指しして失敗する", async () => {
    vi.stubEnv("MEDIA_ORIGIN", undefined);

    await expect(resolveConfig()).rejects.toThrow(
      "環境変数が不足しているか不正です: MEDIA_ORIGIN",
    );
  });
});

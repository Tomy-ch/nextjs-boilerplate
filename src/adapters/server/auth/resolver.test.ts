import { beforeEach, describe, expect, it, vi } from "vitest";

const config = {
  mode: "idp",
  issuer: "https://idp.example.test",
  clientId: "boilerplate-client",
  redirectUri: "http://localhost:3000/api/auth/callback",
  scopes: "openid profile",
  sessionSecret: "local-development-session-secret-change-before-production",
};

const {
  createDefaultSessionResolver,
  createDevelopmentSessionResolver,
  getAuthConfig,
  taintUniqueValue,
} = vi.hoisted(() => ({
  createDefaultSessionResolver: vi.fn((_deps: { resolveRole: unknown }) => ({
    marker: "default",
  })),
  createDevelopmentSessionResolver: vi.fn(() => ({ marker: "development" })),
  getAuthConfig: vi.fn(),
  taintUniqueValue: vi.fn(),
}));

const isDevelopmentOnlyEndpointOpen = vi.hoisted(() => vi.fn());

vi.mock("@/config/auth/auth.server", () => ({ getAuthConfig }));
// 本物は experimental の React を要求する。効くことは `taint/taint.test.ts` が直列化器で確かめ、
// ここは呼んだかどうかだけを見る。
vi.mock("../taint/taint", () => ({ taintUniqueValue }));
vi.mock("@/config/http/http.server", () => ({ getHttpConfig: () => ({ maxUrlBytes: 8_000 }) }));
// 環境の判定だけを差し替える。この module は ENV の読み込みそのものも持っており、丸ごと
// 置き換えると、設定を読む側（`api.server.ts` など）が起動できない。
vi.mock(import("@/config/load-environment"), async (importOriginal) => ({
  ...(await importOriginal()),
  isDevelopmentOnlyEndpointOpen,
}));
vi.mock("./default-session-resolver", () => ({ createDefaultSessionResolver }));
vi.mock("./development-session-resolver", () => ({ createDevelopmentSessionResolver }));

/** 選択は module 内に抱えた 1 つ目で確定するため、条件を変えるたびに読み直す。 */
async function importResolver() {
  vi.resetModules();

  return import("./resolver");
}

beforeEach(() => {
  vi.clearAllMocks();
  getAuthConfig.mockReturnValue(config);
  isDevelopmentOnlyEndpointOpen.mockReturnValue(true);
});

describe("getSessionResolver", () => {
  // ----- 正常系 -----
  it("設定の値で既定 Resolver を組み立てる", async () => {
    const { getSessionResolver } = await importResolver();

    getSessionResolver();

    expect(createDefaultSessionResolver).toHaveBeenCalledWith({
      issuer: config.issuer,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
      sessionSecret: config.sessionSecret,
      maxUrlBytes: 8_000,
      resolveRole: expect.any(Function), // sample:line
    });
  });

  it("署名鍵を、client へ渡せない値として登録する", async () => {
    const { getSessionResolver } = await importResolver();

    getSessionResolver();

    expect(taintUniqueValue).toHaveBeenCalledWith(
      expect.any(String),
      config,
      config.sessionSecret,
    );
  });

  // sample:begin
  it("役割の取得口を渡す", async () => {
    const { getSessionResolver } = await importResolver();
    // 読み直したあとの実体と比べる。上で読んだものは resolver.ts が掴んでいるものと別になる。
    const { fetchSessionRole } = await import("../api/user-roles");

    getSessionResolver();

    const [deps] = createDefaultSessionResolver.mock.calls[0] ?? [];

    expect(deps?.resolveRole).toBe(fetchSessionRole);
  });
  // sample:end

  it("AUTH_MODE が dev で、開発専用の口が開く環境なら開発用 Resolver を選ぶ", async () => {
    getAuthConfig.mockReturnValue({ ...config, mode: "dev" });
    const { getSessionResolver } = await importResolver();

    getSessionResolver();

    expect(createDevelopmentSessionResolver).toHaveBeenCalledOnce();
    expect(createDefaultSessionResolver).not.toHaveBeenCalled();
  });

  it("同じ実体を返し続ける", async () => {
    const { getSessionResolver } = await importResolver();

    expect(getSessionResolver()).toBe(getSessionResolver());
  });

  it("組み立ては 1 度だけ行う", async () => {
    const { getSessionResolver } = await importResolver();

    getSessionResolver();
    getSessionResolver();

    expect(createDefaultSessionResolver).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("開発専用の口が閉じている環境では、AUTH_MODE が dev でも既定 Resolver を選ぶ", async () => {
    getAuthConfig.mockReturnValue({ ...config, mode: "dev" });
    isDevelopmentOnlyEndpointOpen.mockReturnValue(false);
    const { getSessionResolver } = await importResolver();

    getSessionResolver();

    expect(createDevelopmentSessionResolver).not.toHaveBeenCalled();
    expect(createDefaultSessionResolver).toHaveBeenCalledOnce();
  });
});

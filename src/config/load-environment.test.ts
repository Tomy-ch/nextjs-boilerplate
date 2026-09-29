import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadSubject(result: { error?: Error } = {}) {
  const config = vi.fn(() => result);
  vi.doMock("dotenv", () => ({ config }));

  const module = await import("./load-environment");
  return {
    config,
    loadEnvironment: module.loadEnvironment,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  // 実行環境の APP_ENV を前提にしない（`src/config/README.md` のテストの節）。
  vi.stubEnv("APP_ENV", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadEnvironment", () => {
  // ----- 正常系 -----
  it("指定された APP_ENV の env file を外部 ENV を上書きせずに読み込む", async () => {
    vi.stubEnv("APP_ENV", "stg");
    const { config, loadEnvironment } = await loadSubject();

    loadEnvironment();

    expect(config).toHaveBeenCalledWith({
      path: `${process.cwd()}/env/.env.stg`,
      override: false,
      quiet: true,
    });
  });

  it("同じプロセスでは env file を一度だけ読み込む", async () => {
    vi.stubEnv("APP_ENV", "local");
    const { config, loadEnvironment } = await loadSubject();

    loadEnvironment();
    loadEnvironment();

    expect(config).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("APP_ENV 未指定を起動エラーとして返す", async () => {
    const { config, loadEnvironment } = await loadSubject();

    expect(() => loadEnvironment()).toThrow("APP_ENV を指定してください");
    expect(config).not.toHaveBeenCalled();
  });

  it("選べない APP_ENV では env file を読まずに落とす", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { config, loadEnvironment } = await loadSubject();

    expect(() => loadEnvironment()).toThrow("APP_ENV は local, ci, dev, stg, prd");
    expect(config).not.toHaveBeenCalled();
  });

  it("env file の読み込みエラーを、原因を連ねた起動エラーとして返す", async () => {
    vi.stubEnv("APP_ENV", "local");
    const cause = new Error("not found");
    const { loadEnvironment } = await loadSubject({ error: cause });

    expect(() => loadEnvironment()).toThrow("環境変数ファイルを読み込めません");
    expect(() => loadEnvironment()).toThrow(expect.objectContaining({ cause }));
  });
});

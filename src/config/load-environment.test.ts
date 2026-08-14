import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadSubject(result: { error?: Error } = {}) {
  const config = vi.fn(() => result);
  vi.doMock("dotenv", () => ({ config }));

  const module = await import("./load-environment");
  return {
    config,
    loadEnvironment: module.loadEnvironment,
    getApplicationEnvironment: module.getApplicationEnvironment,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadEnvironment", () => {
  it("APP_ENV 未指定時は local の env file を外部 ENV を上書きせずに読み込む", async () => {
    const { config, loadEnvironment } = await loadSubject();

    loadEnvironment();

    expect(config).toHaveBeenCalledWith({
      path: `${process.cwd()}/env/.env.local`,
      override: false,
      quiet: true,
    });
  });

  it("指定された APP_ENV の env file を読み込む", async () => {
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
    const { config, loadEnvironment } = await loadSubject();

    loadEnvironment();
    loadEnvironment();

    expect(config).toHaveBeenCalledOnce();
  });

  it("env file の読み込みエラーを起動エラーとして返す", async () => {
    const { loadEnvironment } = await loadSubject({ error: new Error("not found") });

    expect(() => loadEnvironment()).toThrow("環境変数ファイルを読み込めません");
  });
});

describe("getApplicationEnvironment", () => {
  it("APP_ENV 未指定時は local を返す", async () => {
    const { getApplicationEnvironment } = await loadSubject();

    expect(getApplicationEnvironment()).toBe("local");
  });

  it("指定された環境を返す", async () => {
    vi.stubEnv("APP_ENV", "stg");
    const { getApplicationEnvironment } = await loadSubject();

    expect(getApplicationEnvironment()).toBe("stg");
  });

  it("ENV ファイルを読み込まなくても解決する", async () => {
    vi.stubEnv("APP_ENV", "prd");
    const { config, getApplicationEnvironment } = await loadSubject();

    getApplicationEnvironment();

    expect(config).not.toHaveBeenCalled();
  });

  it("選べない環境名を拒否する", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { getApplicationEnvironment } = await loadSubject();

    expect(() => getApplicationEnvironment()).toThrow("APP_ENV は local, ci, dev, stg, prd");
  });
});

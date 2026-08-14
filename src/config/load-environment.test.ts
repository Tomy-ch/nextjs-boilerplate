import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadSubject(result: { error?: Error } = {}) {
  const config = vi.fn(() => result);
  vi.doMock("dotenv", () => ({ config }));

  const module = await import("./load-environment");
  return {
    config,
    loadEnvironment: module.loadEnvironment,
    findExplicitApplicationEnvironment: module.findExplicitApplicationEnvironment,
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  // 周囲の APP_ENV を明示的に外す。CI は workflow で `ci` を宣言しており、
  // 「未指定のとき」を確かめるケースが実行環境しだいで結果を変えてしまう。
  vi.stubEnv("APP_ENV", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadEnvironment", () => {
  // ----- 正常系 -----
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

  // ----- 異常系 -----
  it("env file の読み込みエラーを起動エラーとして返す", async () => {
    const { loadEnvironment } = await loadSubject({ error: new Error("not found") });

    expect(() => loadEnvironment()).toThrow("環境変数ファイルを読み込めません");
  });
});

describe("findExplicitApplicationEnvironment", () => {
  // ----- 正常系 -----
  it("指定された環境を返す", async () => {
    vi.stubEnv("APP_ENV", "stg");
    const { findExplicitApplicationEnvironment } = await loadSubject();

    expect(findExplicitApplicationEnvironment()).toBe("stg");
  });

  it("APP_ENV 未指定時は既定値へ落とさず null を返す", async () => {
    const { findExplicitApplicationEnvironment } = await loadSubject();

    expect(findExplicitApplicationEnvironment()).toBeNull();
  });

  it("ENV ファイルを読み込まなくても解決する", async () => {
    vi.stubEnv("APP_ENV", "prd");
    const { config, findExplicitApplicationEnvironment } = await loadSubject();

    findExplicitApplicationEnvironment();

    expect(config).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("選べない環境名を拒否する", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { findExplicitApplicationEnvironment } = await loadSubject();

    expect(() => findExplicitApplicationEnvironment()).toThrow(
      "APP_ENV は local, ci, dev, stg, prd",
    );
  });
});

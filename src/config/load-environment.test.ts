import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadSubject(result: { error?: Error } = {}) {
  const config = vi.fn(() => result);
  vi.doMock("dotenv", () => ({ config }));

  const module = await import("./load-environment");
  return {
    config,
    loadEnvironment: module.loadEnvironment,
    findApplicationEnvironment: module.findApplicationEnvironment,
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

describe("findApplicationEnvironment", () => {
  // ----- 正常系 -----
  it("指定された環境を返す", async () => {
    vi.stubEnv("APP_ENV", "stg");
    const { findApplicationEnvironment } = await loadSubject();

    expect(findApplicationEnvironment()).toBe("stg");
  });

  it("APP_ENV 未指定時は null を返す", async () => {
    const { findApplicationEnvironment } = await loadSubject();

    expect(findApplicationEnvironment()).toBeNull();
  });

  it("ENV ファイルを読み込まなくても解決する", async () => {
    vi.stubEnv("APP_ENV", "prd");
    const { config, findApplicationEnvironment } = await loadSubject();

    findApplicationEnvironment();

    expect(config).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("選べない環境名を拒否する", async () => {
    vi.stubEnv("APP_ENV", "production");
    const { findApplicationEnvironment } = await loadSubject();

    expect(() => findApplicationEnvironment()).toThrow("APP_ENV は local, ci, dev, stg, prd");
  });
});

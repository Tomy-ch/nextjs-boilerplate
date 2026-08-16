import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogLevel } from "./logger";

const mocks = vi.hoisted(() => ({ createLogger: vi.fn() }));

vi.mock("./pino.server", () => ({ createLogger: mocks.createLogger }));

describe("initializeLogger", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createLogger.mockReset();
  });

  // ----- 正常系 -----
  it("起動時に一度だけ logger を生成する", async () => {
    const instance = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    mocks.createLogger.mockReturnValue(instance);
    const { initializeLogger } = await import("./logging.server");
    const options = { level: LogLevel.INFO };

    initializeLogger(options);
    initializeLogger(options);

    expect(mocks.createLogger).toHaveBeenCalledOnce();
  });
});

describe("getLogger", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createLogger.mockReset();
  });

  // ----- 正常系 -----
  it("初期化済みの logger を返す", async () => {
    const instance = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
    mocks.createLogger.mockReturnValue(instance);
    const { getLogger, initializeLogger } = await import("./logging.server");

    initializeLogger({ level: LogLevel.INFO });

    expect(getLogger()).toBe(instance);
  });

  // ----- 異常系 -----
  it("起動前に logger を取得すると失敗する", async () => {
    const { getLogger } = await import("./logging.server");

    expect(() => getLogger()).toThrow("logger は起動時に初期化されていません");
  });
});

describe("reportQuietly", () => {
  // ----- 正常系 -----
  it("渡された記録を実行する", async () => {
    const { reportQuietly } = await import("./logging.server");
    const report = vi.fn();

    reportQuietly(report);

    expect(report).toHaveBeenCalledOnce();
  });

  // ----- 異常系 -----
  it("記録が失敗しても投げない", async () => {
    const { reportQuietly } = await import("./logging.server");

    expect(() =>
      reportQuietly(() => {
        throw new Error("logger は起動時に初期化されていません");
      }),
    ).not.toThrow();
  });
});

import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { LogLevel } from "./logger";
import { createLogger } from "./pino.server";

function readLog(stream: PassThrough): Record<string, unknown> {
  const parsed: unknown = JSON.parse(stream.read().toString());
  if (!isRecord(parsed)) {
    throw new Error("Pino の出力が object ではありません");
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

describe("createLogger", () => {
  it("構造化フィールドと trace 相関情報を JSON ログへ出力する", () => {
    const stream = new PassThrough();
    const logger = createLogger({
      level: LogLevel.DEBUG,
      destination: stream,
      traceContextExtractor: () => ({ traceId: "trace-1", spanId: "span-1" }),
    });

    logger.info("記録を作成しました", { record_id: "record-1" });

    expect(readLog(stream)).toMatchObject({
      msg: "記録を作成しました",
      record_id: "record-1",
      trace_id: "trace-1",
      span_id: "span-1",
    });

    logger.debug("デバッグ情報です");
    logger.warn("警告です");
    logger.error("エラーです");
  });

  it("秘匿フィールドを redact する", () => {
    const stream = new PassThrough();
    const logger = createLogger({ level: LogLevel.INFO, destination: stream });

    logger.warn("認証に失敗しました", { token: "secret-value" });

    expect(readLog(stream)).toMatchObject({ token: "[REDACTED]" });
  });

  it("注入された sink に redact 済みのログレコードを渡す", () => {
    const logRecordSink = vi.fn();
    const logger = createLogger({ level: LogLevel.INFO, logRecordSink });

    logger.info("ログを送信します", { authorization: "Bearer secret" });

    expect(logRecordSink).toHaveBeenCalledWith({
      level: LogLevel.INFO,
      message: "ログを送信します",
      fields: { authorization: "[REDACTED]" },
    });
  });
});

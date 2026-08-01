import "server-only";

import type { Logger } from "./logger";
import { createLogger } from "./pino.server";

type InitializeLoggerOptions = Parameters<typeof createLogger>[0];

let logger: Logger | undefined;

/** 起動境界で注入された設定から、プロセス共通の logger を一度だけ初期化する。 */
export function initializeLogger(options: InitializeLoggerOptions): void {
  logger ??= createLogger(options);
}

/** 初期化済みのアプリケーション logger を返す。 */
export function getLogger(): Logger {
  if (logger === undefined) {
    throw new Error("logger は起動時に初期化されていません");
  }

  return logger;
}

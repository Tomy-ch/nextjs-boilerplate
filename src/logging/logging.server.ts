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

/**
 * 記録できないことで、記録の対象になった処理まで失敗させない。
 *
 * @remarks
 * {@link getLogger} は初期化されていなければ投げます。記録は後から辿るための手段であって利用者へ
 * 見せる結果ではないため、書き出す側の失敗が呼び出し元の成否を変えてはいけません。
 *
 * @param report - 記録の呼び出し
 */
export function reportQuietly(report: () => void): void {
  try {
    report();
  } catch {
    // 意図的に握り潰す: 記録の失敗を呼び出し元へ持ち出さない。
  }
}

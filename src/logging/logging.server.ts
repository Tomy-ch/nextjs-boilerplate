import "server-only";

import type { Logger } from "./logger";
import { createLogger } from "./pino.server";

type InitializeLoggerOptions = Parameters<typeof createLogger>[0];

/**
 * 生成した logger を置く場所。
 *
 * @remarks
 * **モジュール変数では届きません。** Next は起動境界と RSC を別のモジュールグラフとして組むため、
 * このファイルは 1 プロセスの中で 2 回インスタンス化されます（`process.pid` は同じで、モジュール
 * ごとの識別子だけが異なることを実測で確認しています）。起動境界で生成した logger をモジュール
 * 変数に置くと、server component から呼ぶ {@link getLogger} は未初期化のまま投げます。realm は
 * 共有されているので、両方から見える場所として registered symbol を使います。
 */
const LOGGER_KEY = Symbol.for("nextjs-boilerplate.logging.logger");

/** 起動境界で注入された設定から、プロセス共通の logger を一度だけ初期化する。 */
export function initializeLogger(options: InitializeLoggerOptions): void {
  if (findLogger() === undefined) {
    Reflect.set(globalThis, LOGGER_KEY, createLogger(options));
  }
}

/**
 * 初期化済みのアプリケーション logger を返す。
 *
 * @throws 起動境界の初期化を経ていないとき
 */
export function getLogger(): Logger {
  const logger = findLogger();

  if (logger === undefined) {
    throw new Error("logger は起動時に初期化されていません");
  }

  return logger;
}

/** 注入された logger を読む。別のモジュールインスタンスが書いた値なので、形を確かめてから使う。 */
function findLogger(): Logger | undefined {
  const value: unknown = Reflect.get(globalThis, LOGGER_KEY);

  return isLogger(value) ? value : undefined;
}

function isLogger(value: unknown): value is Logger {
  return (
    typeof value === "object" &&
    value !== null &&
    "debug" in value &&
    "info" in value &&
    "warn" in value &&
    "error" in value
  );
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

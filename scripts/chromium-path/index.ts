#!/usr/bin/env node

// ゲートと同じ chromium の実行ファイルを答える入口。
//
//   chromium-path    lockfile の `@playwright/test` が使う chromium の実行ファイルのパスを 1 行で出す
//
// 判定を持たないので隣のモジュールは無い。
//
// stdout に出すのはパス 1 行だけで、案内はすべて stderr へ出す。実体が無いときに空の答えを
// 返すと、受け取った道具が自動検出へ落ちて別のブラウザを黙って掴むので、何も出さずに 2 で終わる。
import { existsSync } from "node:fs";

import { chromium } from "@playwright/test";

/**
 * 引数を検め、実行ファイルのパスを stdout へ 1 行出す。
 *
 * @param argv - コマンドラインの引数。1 つも取らない。
 */
function main(argv: readonly string[]): void {
  if (argv.length > 0) {
    fail(`引数は取りません: ${argv.join(" ")}`);
  }

  const path = chromium.executablePath();

  if (!existsSync(path)) {
    fail(`chromium が入っていません: ${path}\n  pnpm exec playwright install chromium`);
  }

  console.log(path);
}

/**
 * 案内を stderr へ出し、答えを出さずに 2 で終える。
 *
 * @param message - 人へ出す案内。
 */
function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(2);
}

main(process.argv.slice(2));

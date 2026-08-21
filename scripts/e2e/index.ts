#!/usr/bin/env node

// 画面単位の検証を挟む道具の入口。
//
//   names <report.json>   基準画像と食い違った画面の名前（カンマ区切り）
//
// story 単位の側（`scripts/vrt`）と違って撮り直しの範囲は出さない。画面の撮り直しは常に全数で、
// 絞れる範囲という概念を持たない（`vrt/README.md`）。
import { readFileSync } from "node:fs";

import { collectFailedScreens, formatScreenNames } from "./report.js";

const USAGE = "usage: e2e names <report.json>";

function main(): void {
  const [command, file] = process.argv.slice(2);

  if (command !== "names" || !file) fail(USAGE);

  try {
    console.log(formatScreenNames(collectFailedScreens(readFileSync(file, "utf8"))));
  } catch (e) {
    fail(`レポートを読めません: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

main();

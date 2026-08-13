#!/usr/bin/env node

// VRT の実行を挟む道具の入口。
//
//   table <report.json>   食い違った story の一覧表（PR コメントの本文）
//   ids <report.json>     撮り直す範囲として渡す story の id（カンマ区切り）
//   inputs                絵を決める入力のハッシュ
//   gate <記録した値のファイル>  比較を省いてよいか（skip / run）
//
// table と ids を同じレポートから出すことで、表に出ていない story が承認で撮り直される余地を
// 無くす。
import { existsSync, readFileSync } from "node:fs";
import { collectRenderInputs, decideGate, renderInputsHash } from "./render-hash.js";
import { collectFailures, formatStoryIDs, formatTable } from "./report.js";

const USAGE = "usage: vrt <table|ids <report.json>|inputs|gate <file>>";

function main(): void {
  const [command, file] = process.argv.slice(2);

  switch (command) {
    case "table":
      console.log(formatTable(failures(file)));

      return;
    case "ids":
      console.log(formatStoryIDs(failures(file)));

      return;
    case "inputs":
      console.log(currentHash());

      return;
    case "gate":
      if (!file) fail(USAGE);
      console.log(decideGate(existsSync(file) ? readFileSync(file, "utf8") : null, currentHash()));

      return;
    default:
      fail(USAGE);
  }
}

function failures(file: string | undefined): ReturnType<typeof collectFailures> {
  if (!file) fail(USAGE);
  try {
    return collectFailures(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`レポートを読めません: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function currentHash(): string {
  try {
    return renderInputsHash(process.cwd(), collectRenderInputs(process.cwd()));
  } catch (e) {
    fail(`入力を読めません: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

main();

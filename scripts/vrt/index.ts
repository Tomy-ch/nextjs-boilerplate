#!/usr/bin/env node

// Playwright の JSON レポートを、PR コメントの一覧表と、承認時に撮り直す範囲へ変換する。
//
//   table : 食い違った story の一覧表（PR コメントの本文）
//   ids   : 撮り直す範囲として渡す story の id（カンマ区切り）
//
// 2 つを同じレポートから出すことで、表に出ていない story が承認で撮り直される余地を無くす。
import { readFileSync } from "node:fs";
import { collectFailures, formatStoryIDs, formatTable } from "./report.js";

const USAGE = "usage: vrt <table|ids> <report.json>";

function main(): void {
  const [command, file] = process.argv.slice(2);
  if (!file) fail(USAGE);

  let failures: ReturnType<typeof collectFailures>;
  try {
    failures = collectFailures(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`レポートを読めません: ${e instanceof Error ? e.message : String(e)}`);
  }

  switch (command) {
    case "table":
      console.log(formatTable(failures));

      return;
    case "ids":
      console.log(formatStoryIDs(failures));

      return;
    default:
      fail(USAGE);
  }
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

main();

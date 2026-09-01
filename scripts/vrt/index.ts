#!/usr/bin/env node

// VRT の実行を挟む道具の入口。
//
//   table <report.json>   食い違った story の一覧表（PR コメントの本文）
//   ids <report.json>     撮り直す範囲として渡す story の id（カンマ区切り）
//   inputs                絵を決める入力のハッシュ
//   gate <記録した値のファイル...>  検査を省いてよいか（skip / run）。1 つでも一致すれば skip
//   clear-stories         全数撮り直しの前に、story の基準画像を置き場から消す
//   orphans <report.json> 撮影対象を失った基準画像の相対パス（1 行 1 件）。撮り直しが消す相手
//   missing <report.json> 基準画像を持たない story の id（1 行 1 件）。撮り直しが撮る相手
//
// table と ids を同じレポートから出すことで、表に出ていない story が承認で撮り直される余地を
// 無くす。
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { clearableStoryEntries, STORE_PATH } from "../../baseline/lib/store.js";
import { collectRenderInputs, decideGate, renderInputsHash } from "./render-hash.js";
import {
  collectFailures,
  collectMissingBaselines,
  collectOrphanBaselines,
  formatStoryIDs,
  formatTable,
} from "./report.js";

const USAGE =
  "usage: vrt <table|ids|orphans|missing <report.json>|inputs|gate <file...>|clear-stories>";

function main(): void {
  const [command, file, ...rest] = process.argv.slice(2);

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
      console.log(decideGate([file, ...rest].map(recordedOf), currentHash()));

      return;
    case "clear-stories":
      clearStories();

      return;
    case "orphans":
      if (!file) fail(USAGE);
      console.log(collectOrphanBaselines(readFileSync(file, "utf8")).join("\n"));

      return;
    case "missing":
      if (!file) fail(USAGE);
      console.log(collectMissingBaselines(readFileSync(file, "utf8")).join("\n"));

      return;
    default:
      fail(USAGE);
  }
}

/**
 * story の基準画像を置き場から消す。撮り直しが上書きで書き直す。
 *
 * @remarks
 * 判定は {@link clearableStoryEntries} が持ちます。ここは読み書きと、置き場が取り込まれて
 * いないときに止めることだけを担います。
 */
function clearStories(): void {
  if (!existsSync(`${STORE_PATH}/.git`)) {
    fail(
      `${STORE_PATH} が取り込まれていません。git submodule update --init ${STORE_PATH} を実行してください。`,
    );
  }

  const removed = clearableStoryEntries(readdirSync(STORE_PATH));

  for (const entry of removed) {
    rmSync(`${STORE_PATH}/${entry}`, { force: true, recursive: true });
  }

  console.log(`🧹 story の区画を ${removed.length} 件消しました。撮り直しが書き直します。`);
}

function failures(file: string | undefined): ReturnType<typeof collectFailures> {
  if (!file) fail(USAGE);
  try {
    return collectFailures(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`レポートを読めません: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function recordedOf(file: string): string | null {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
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

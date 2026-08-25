#!/usr/bin/env node

// 先送りにした検査を、この PR で回しておくべきかを知らせる入口。
//
//   volume <base ref> <line>   base からの差分の量を数え、line を超えたかを GitHub の出力へ書く
//
// **これはゲートではない。** 判定の中身と、なぜ量で見るのかは volume.ts が持つ。
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { numstatArgs, parseNumstat } from "../lib/numstat.js";
import { countChangedLines } from "./volume.js";

const USAGE = "usage: deferred-checks volume <base ref> <line>";

function main(): void {
  const [command, baseRef, line] = process.argv.slice(2);

  if (command !== "volume" || !baseRef || !line) fail(USAGE);

  const alertAt = Number.parseInt(line, 10);
  if (!Number.isFinite(alertAt) || alertAt <= 0) fail(`知らせる線が読めません: ${line}`);

  volume(baseRef, alertAt);
}

/**
 * 差分の量を数え、GitHub Actions の出力へ書く。
 *
 * @remarks
 * `...` ではなく 2 コミットを比較します。merge base は共有した履歴を要し、浅い checkout は
 * それを持ちません。差は「分岐後に base 側で入った変更も数える」ことで、知らせる側へ倒れます。
 */
function volume(baseRef: string, alertAt: number): void {
  const numstat = spawnSync("git", numstatArgs([baseRef, "HEAD"]), { encoding: "utf8" });

  if (numstat.status !== 0) {
    throw new Error(`${baseRef} との差分を取れませんでした。base を fetch していますか。`);
  }

  const changedLines = countChangedLines(parseNumstat(numstat.stdout));
  const output = process.env.GITHUB_OUTPUT;

  if (output === undefined) {
    throw new Error("GITHUB_OUTPUT がありません。この副命令は CI から呼ばれます。");
  }

  appendFileSync(
    output,
    [`changed-lines=${changedLines}`, `over=${changedLines >= alertAt}`, ""].join("\n"),
  );

  console.error(`🔎 ${changedLines} 行（知らせる線 ${alertAt}）`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

main();

#!/usr/bin/env node

// スキャナが書き出した SARIF を、code scanning へ取り込める形へ整える。
// `make sast-sarif` と `make bearer-sarif` が走査の直後に呼ぶ。
import fs from "node:fs";

import { normalizeSarif } from "./normalize.js";

function printUsage(): void {
  console.log(
    [
      "使い方: pnpm exec tsx scripts/sarif <sarif ファイル>",
      "",
      "  ソースで抑止した所見を落とし、results を配列へ揃えて同じファイルへ書き戻す。",
    ].join("\n"),
  );
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const file = args[0];

  if (file === undefined) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const normalized = normalizeSarif(JSON.parse(fs.readFileSync(file, "utf8")));

  fs.writeFileSync(file, `${JSON.stringify(normalized)}\n`);
}

main();

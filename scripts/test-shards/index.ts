#!/usr/bin/env node

// 分割したテストの結果が全台ぶん届いているかを確かめる入口。
//
//   verify <置き場>   台の書いた結果を数え、揃っていなければ落とす
//
// 束ねる前に落とすのは、足りないまま束ねると走らなかったテストがカバレッジの不足として現れ、
// 原因を取り違えるからである。
import { readdirSync } from "node:fs";

import { expectedShardTotal } from "../lib/shard-completeness.js";
import { readBlobTotal } from "./blob.js";

function main(): void {
  const [command, directory] = process.argv.slice(2);

  if (command !== "verify" || directory === undefined) {
    console.error("usage: test-shards verify <blob-directory>");
    process.exit(1);
  }

  try {
    expectedShardTotal(readdirSync(directory), readBlobTotal);
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    console.error("   届かなかった台の実行ログを読んでください。このまま合流させると、");
    console.error("   走らなかったテストがカバレッジの不足として現れ、原因を取り違えます。");
    process.exit(1);
  }
}

main();

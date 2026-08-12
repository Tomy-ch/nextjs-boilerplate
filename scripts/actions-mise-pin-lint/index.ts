#!/usr/bin/env node

// setup-mise が固定する mise の版と digest が、キャッシュキーと揃っているかを検査する。
//
// mise 自身の版は `mise.toml` に書けない（あれは mise が解決する対象を宣言するファイル
// なので）。よって版の宣言はこの action の中だけにあり、キャッシュキーが同じ値を二度目に
// 持つ。片方だけを直した状態は落ちるが、原因に辿り着くまでが遠い。
import { readFileSync } from "node:fs";
import path from "node:path";
import { findViolations, readPin } from "./pin-consistency.js";

const ACTION_FILE = ".github/actions/setup-mise/action.yaml";

function main(): void {
  const file = path.join(process.cwd(), ACTION_FILE);

  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    abort(`${ACTION_FILE} を読めません（リポジトリルートで実行してください）`);
  }

  const violations = findViolations(readPin(source));
  if (violations.length > 0) {
    console.error(`❌ ${ACTION_FILE} の版 / digest / キャッシュキーが揃っていません`);
    for (const violation of violations) console.error(`   ${violation}`);
    process.exit(1);
  }

  console.log("✅ mise の版 / digest / キャッシュキーが揃っています");
}

// 検査そのものが成立していない状態は、規約違反 (exit 1) と区別して exit 2 で落とす。
function abort(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(2);
}

main();

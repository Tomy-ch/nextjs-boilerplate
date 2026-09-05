#!/usr/bin/env node

// `package.json` の version をリリースブランチ名へ合わせる入口。
//
//   package-version stamp [<ref>]   ブランチ名の版を書き込む
//   package-version check [<ref>]   ブランチ名の版と一致するかを見る（書き込まない）
//
// <ref> を省いたときは GITHUB_REF_NAME を読む。リリース版を名乗らない ref では何もしない。
// 何を書くか・何を落とすかは [version.ts](version.ts) が持ち、ここは読み書きと終了コードだけを担う。
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { isStampMode, planStamp, reportPlan } from "./version.js";

const MANIFEST = "package.json";

function main(argv: readonly string[]): void {
  const [mode, ref = process.env.GITHUB_REF_NAME ?? ""] = argv;

  if (mode === undefined || !isStampMode(mode)) {
    fail("使い方: package-version <stamp|check> [<ref>]");
  }

  const manifest = path.join(process.cwd(), MANIFEST);
  const plan = planStamp(ref, () => readFileSync(manifest, "utf8"));

  if (plan.kind === "write" && mode === "stamp") {
    writeFileSync(manifest, plan.content);
  }

  const report = reportPlan(plan, mode);

  if (report.failed) {
    console.error(report.message);
    process.exit(1);
  }

  console.log(report.message);
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

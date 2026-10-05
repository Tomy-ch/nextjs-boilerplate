// `pnpm docs:tally` の入口。`docs/rules.md` を数え、集計ブロックを `docs/traceability.md` と
// そのミラーへ書き出す。数え方と描き方は [tally.ts](tally.ts) が持つ。

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  collectRuleTally,
  missingTargets,
  renderRuleTally,
  replaceGeneratedBlock,
  TALLY_TARGETS,
} from "./tally";

const ROOT = resolve(import.meta.dirname, "../..");
const RULES = resolve(ROOT, "docs/rules.md");

const tally = collectRuleTally(readFileSync(RULES, "utf8"));

try {
  // 書き出す前に貼り付け先を両方確かめ、欠けがあれば何も書かずに落とす。
  const missing = missingTargets(TALLY_TARGETS, (path) => existsSync(resolve(ROOT, path)));

  if (missing.length > 0) throw new Error(`${missing.join(" / ")} がありません`);

  for (const { path, language } of TALLY_TARGETS) {
    const target = resolve(ROOT, path);

    writeFileSync(
      target,
      replaceGeneratedBlock(readFileSync(target, "utf8"), renderRuleTally(tally, language)),
    );
    console.log(`✅ 節 ${tally.sections} / 規約 ${tally.rules} 件を ${path} へ書き出しました`);
  }
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

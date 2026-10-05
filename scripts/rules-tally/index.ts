// `pnpm docs:tally` の入口。`docs/rules.md` を数え、集計ブロックを `docs/traceability.md` と
// そのミラーへ書き出す。数え方と描き方は [tally.ts](tally.ts) が持つ。

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  collectRuleTally,
  renderRuleTally,
  replaceGeneratedBlock,
  type TallyLanguage,
} from "./tally";

const ROOT = resolve(import.meta.dirname, "../..");
const RULES = resolve(ROOT, "docs/rules.md");

/** 集計ブロックの貼り付け先。canonical とそのミラーへ、同じ集計を各言語で書く。 */
const TARGETS: readonly { readonly path: string; readonly language: TallyLanguage }[] = [
  { language: "en", path: "docs/traceability.md" },
  { language: "ja", path: "docs/traceability.ja.md" },
];

const tally = collectRuleTally(readFileSync(RULES, "utf8"));

try {
  for (const { path, language } of TARGETS) {
    const target = resolve(ROOT, path);

    if (!existsSync(target)) {
      console.warn(`⚠️ ${path} が無いので書き出しませんでした`);
      continue;
    }

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

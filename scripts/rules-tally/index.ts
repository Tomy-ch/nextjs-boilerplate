import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { collectRuleTally, renderRuleTally, replaceGeneratedBlock } from "./tally";

const ROOT = resolve(import.meta.dirname, "../..");
const RULES = resolve(ROOT, "docs/rules.md");
const TRACEABILITY = resolve(ROOT, "docs/traceability.md");

const tally = collectRuleTally(readFileSync(RULES, "utf8"));

try {
  const block = renderRuleTally(tally);

  writeFileSync(TRACEABILITY, replaceGeneratedBlock(readFileSync(TRACEABILITY, "utf8"), block));
  console.log(
    `✅ 節 ${tally.sections} / 規約 ${tally.rules} 件を docs/traceability.md へ書き出しました`,
  );
} catch (error) {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

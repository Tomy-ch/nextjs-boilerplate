import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

import {
  assertWithinOutputRoot,
  assertWithinRepositoryRoot,
  resolveCopyEntries,
} from "./portal-manifest";

const MANIFEST_PATH = "docs/portal/manifest.yaml";
const OUTPUT_ROOT = "docs/portal/guides";

if (!existsSync(MANIFEST_PATH)) {
  console.error(`❌ manifest がありません: ${MANIFEST_PATH}`);
  process.exit(1);
}

const entries = resolveCopyEntries(parse(readFileSync(MANIFEST_PATH, "utf8")));

assertWithinOutputRoot(entries, OUTPUT_ROOT, resolve);
assertWithinRepositoryRoot(entries, ".", resolve);

// 複製の前に全ての src を検査する。途中で気付いて止まると、出力ディレクトリを
// 消した後の半端な状態が残る。
const missing = entries.filter((entry) => !existsSync(entry.src));

if (missing.length) {
  console.error("❌ manifest が指す src が見つかりません（manifest の陳腐化を解消してください）:");

  for (const entry of missing) {
    console.error(`  - [${entry.section}] ${entry.src}`);
  }

  process.exit(1);
}

rmSync(OUTPUT_ROOT, { force: true, recursive: true });
mkdirSync(OUTPUT_ROOT, { recursive: true });

for (const entry of entries) {
  mkdirSync(dirname(entry.dst), { recursive: true });
  copyFileSync(entry.src, entry.dst);
  console.log(`✔ [${entry.section}] ${entry.src} -> ${entry.dst}`);
}

console.log(`✅ ${entries.length} 件を ${OUTPUT_ROOT} へ複製しました`);

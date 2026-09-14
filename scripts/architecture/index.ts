import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { KERNELS } from "../../architecture";
import { decideOutcome, type ReadmeSource, scanAction } from "./readme-scan";

/**
 * `src/` の下の README を読み集める。
 *
 * @remarks
 * 1 件ごとの扱いは {@link scanAction} が決めます。ここに残るのは `readdirSync` と `readFileSync` の
 * 遣り取りだけで、**判断は持ちません**（`scripts/lib/untested-modules.ts` の `ENTRYPOINT_PATTERNS`）。
 *
 * 走査するのは `src/` だけです。カーネルの外に居る要素（`mocks`）はこの検査の対象外で、その依存は
 * 別の場所が持ちます。
 */
function readReadmes(directory: string): ReadmeSource[] {
  const found: ReadmeSource[] = [];

  // 種別は `readdirSync` が返したものを使い、`statSync` で問い直さない。問い直すと
  // 「調べた時点」と「読む時点」が別々になり、その間に入れ替わったものを読む形になる。
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const action = scanAction({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isSymbolicLink: entry.isSymbolicLink(),
    });

    if (action === "recurse") {
      found.push(...readReadmes(path));
    } else if (action === "collect") {
      found.push({ path, source: readFileSync(path, "utf8") });
    }
  }

  return found;
}

const outcome = decideOutcome(
  existsSync("src") ? readReadmes("src") : [],
  KERNELS.filter((kernel) => !existsSync(`src/${kernel}/README.md`)).map(
    (kernel) => `src/${kernel}/README.md がありません`,
  ),
  process.argv.includes("--write") ? "write" : "check",
);

if (outcome.kind === "failed") {
  console.error("❌ 層 README の境界宣言が architecture.ts と食い違っています:");

  for (const message of outcome.messages) {
    console.error(`  - ${message}`);
  }

  process.exit(1);
}

if (outcome.kind === "written") {
  for (const { path, content } of outcome.writes) {
    writeFileSync(path, content);
    console.log(`  ${path}`);
  }

  console.log(`✅ ${outcome.writes.length} 件の imports-allowed を生成しました`);
} else {
  console.log("✅ 層 README の境界宣言は architecture.ts と一致しています");
}

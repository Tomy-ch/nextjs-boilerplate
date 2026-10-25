import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isBlocking, parseAudit } from "./advisories";
import { renderReport } from "./report";
import { parseSuppressions } from "./suppressions";

/** 抑止の置き場。リポジトリの根から見た位置。 */
const OSV_CONFIG = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
  "osv-scanner.toml",
);

/**
 * 依存監査のゲート。
 *
 * 使い方: `tsx scripts/audit-gate`
 *
 * 修正版のある high / critical が 1 件でもあれば exit 1。`osv-scanner.toml` で期限内に抑止したものは除く。
 */

/**
 * `pnpm audit --json` を回して標準出力を取る。
 *
 * @remarks
 * 検出があると pnpm は非ゼロで終わるため、例外から stdout を拾い直します。**取れなかったときに
 * 「検出なし」へ倒さない** —— 監査が動かなかったことと綺麗だったことを同じ緑にすると、この
 * ゲートは壊れた瞬間から永久に通り続けます。
 */
function runAudit(): string {
  try {
    return execFileSync("pnpm", ["audit", "--json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (error instanceof Error && "stdout" in error && typeof error.stdout === "string") {
      return error.stdout;
    }

    throw error;
  }
}

function main(): void {
  const advisories = parseAudit(runAudit());
  const suppressed = parseSuppressions(fs.readFileSync(OSV_CONFIG, "utf8"), new Date());
  const blocking = advisories.filter((advisory) => isBlocking(advisory, suppressed));

  console.log(renderReport(advisories, suppressed));

  if (blocking.length > 0) {
    console.error(`\n❌ 修正版のある high / critical が ${blocking.length} 件あります。`);
    process.exitCode = 1;

    return;
  }

  console.log("\n✅ 修正版のある high / critical はありません。");
}

main();

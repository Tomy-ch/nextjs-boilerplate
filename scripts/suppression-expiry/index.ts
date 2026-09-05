#!/usr/bin/env node

// 抑止の撤回条件を週に一度見る入口。
//
// 抑止に条件を書く運用（ADR 0110 3.4）は、条件を満たした時点で誰かが撤去して初めて成立する。
// 見る機構が無いと、期限を過ぎた宣言が残り続け、次に同じ枠を使う人が期限そのものを軽く扱う。
//
//   pnpm exec tsx scripts/suppression-expiry            期限を過ぎた宣言があれば 1 で落ちる
//   pnpm exec tsx scripts/suppression-expiry --report <path>   一覧を Markdown で書き出す

import fs from "node:fs";

import { expiredSuppressions, type Suppression } from "./rules.js";
import { scanSuppressions } from "./scan.js";

/** 判定の基準日。時刻を持ち込むと、実行が CI のどの時間帯かで結果が揺れる。 */
const today = new Date().toISOString().slice(0, 10);

const suppressions = scanSuppressions();
const expired = expiredSuppressions(suppressions, today);

/**
 * 全件の一覧。
 *
 * @remarks
 * **期限を過ぎたものだけでなく、全件を出します。** 判定できるのは日付だけで、「上流が N 以上を
 * 要求したら」「サンプル破棄が働いた後」は機械では決まりません。落ちた件だけを出すと、決まらない
 * 条件が誰にも読まれないまま残ります。
 */
function digest(entries: readonly Suppression[]): string {
  const rows = entries.map(
    (entry) => `| \`${entry.source}\` | \`${entry.subject}\` | ${entry.condition} |`,
  );

  return ["| 面 | 対象 | 撤回条件 |", "| --- | --- | --- |", ...rows].join("\n");
}

const reportIndex = process.argv.indexOf("--report");

if (reportIndex !== -1) {
  const reportPath = process.argv[reportIndex + 1];

  if (reportPath === undefined) {
    console.error("✗ suppression-expiry: --report には書き出す先が要ります");
    process.exit(1);
  }

  const heading =
    expired.length === 0
      ? "撤回条件を満たした宣言はありません。"
      : `**${expired.length} 件が撤回条件を満たしています。**\n\n${expired
          .map((entry) => `- \`${entry.source}\` の \`${entry.subject}\`（期限 ${entry.dueDate}）`)
          .join("\n")}`;

  fs.writeFileSync(
    reportPath,
    `${heading}\n\n## いま置かれている抑止\n\n${digest(suppressions)}\n`,
  );
}

console.log(`— 抑止 ${suppressions.length} 件（基準日 ${today}）`);
console.log(digest(suppressions));

if (expired.length === 0) {
  console.log(`\n✓ suppression-expiry: 撤回条件を満たした宣言はありません`);
  process.exit(0);
}

console.error(`\n✗ suppression-expiry: ${expired.length} 件が撤回条件を満たしています\n`);
for (const entry of expired) {
  console.error(`  ${entry.source} の ${entry.subject}（期限 ${entry.dueDate}）`);
}
console.error(
  "\n条件を満たした宣言は撤去してください。まだなら、条件そのものを書き直してください。",
);
process.exit(1);

// 抑止の宣言を、置かれている 3 つの面から読み取る。
//
// 面が増えたらここへ足す。読み取りを判定と分けているのは、判定（`rules.ts`）を面の書式から
// 独立させるためで、形式の違う面を 1 つの一覧へ均すのがこの層の仕事である。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Suppression } from "./rules.js";

/** リポジトリの根。この層だけが実ファイルの位置を知る。 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** 依存の脆弱性の抑止。 */
const OSV_PATH = "osv-scanner.toml";
/** 冷却期間の例外。 */
const WORKSPACE_PATH = "pnpm-workspace.yaml";
/** 動的スキャンの所見の抑止。 */
const ZAP_PATH = ".github/zap/rules.tsv";

/** `id = "..."` と `reason = "..."` の対。TOML の解析器を持ち込まずに済む形だけを受ける。 */
const OSV_ENTRY = /\[\[IgnoredVulns\]\]\s*\nid\s*=\s*"([^"]+)"\s*\nreason\s*=\s*"([^"]*)"/g;

/** `minimumReleaseAgeExclude` の 1 行。`  - <対象> # <理由>` の形。 */
const COOLDOWN_ENTRY = /^\s*-\s*(\S+)\s*#\s*(.*)$/;

function read(root: string, relativePath: string): string {
  const absolute = path.join(root, relativePath);

  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

/** 脆弱性 ID ごとの抑止と、その理由に添えられた撤回条件。 */
function osvSuppressions(root: string): readonly Suppression[] {
  return [...read(root, OSV_PATH).matchAll(OSV_ENTRY)].map(([, subject, condition]) => ({
    source: OSV_PATH,
    subject: subject ?? "",
    condition: condition ?? "",
  }));
}

/**
 * 冷却期間の例外。
 *
 * @remarks
 * `overrides` は読みません。あちらの撤回条件は「上流が N 以上を要求したら」で、日付を持たない
 * ためです。日付を持たない宣言をここへ流しても、判定できないまま件数だけが増えます。
 */
function cooldownSuppressions(root: string): readonly Suppression[] {
  const lines = read(root, WORKSPACE_PATH).split("\n");
  const start = lines.findIndex((line) => line.startsWith("minimumReleaseAgeExclude:"));

  if (start === -1) {
    return [];
  }

  const entries: Suppression[] = [];

  for (const line of lines.slice(start + 1)) {
    const matched = COOLDOWN_ENTRY.exec(line);

    if (matched === null) {
      break;
    }

    entries.push({
      source: WORKSPACE_PATH,
      subject: matched[1] ?? "",
      condition: matched[2] ?? "",
    });
  }

  return entries;
}

/** 動的スキャンの規則ごとの抑止。`#` で始まる行は解説なので落とす。 */
function zapSuppressions(root: string): readonly Suppression[] {
  return read(root, ZAP_PATH)
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .map((line) => line.split("\t"))
    .map(([subject, , condition]) => ({
      source: ZAP_PATH,
      subject: subject ?? "",
      condition: condition ?? "",
    }));
}

/**
 * 3 つの面の宣言を 1 つの一覧へ均す。
 *
 * @param root - 読みに行くリポジトリの根。既定は自分が置かれているリポジトリ
 */
export function scanSuppressions(root: string = REPO_ROOT): readonly Suppression[] {
  return [...osvSuppressions(root), ...cooldownSuppressions(root), ...zapSuppressions(root)];
}

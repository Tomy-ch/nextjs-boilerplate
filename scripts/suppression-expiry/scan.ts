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

function read(root: string, relativePath: string): string {
  const absolute = path.join(root, relativePath);

  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
}

/**
 * `<key> = "<値>"` の値。
 *
 * @remarks
 * TOML の解析器を持ち込まずに済ませます。**見つからない鍵は空で返します** —— ADR 0110 は
 * `reason` を必須としますが、必須のつもりで読み飛ばすと、条件を持たない抑止だけが一覧から
 * 消え、いちばん確かめたいものが見えなくなります。
 */
function quotedValue(entry: string, key: string): string {
  const marker = `${key} = "`;
  const start = entry.indexOf(marker);

  if (start === -1) {
    return "";
  }

  const rest = entry.slice(start + marker.length);
  const end = rest.indexOf('"');

  return end === -1 ? "" : rest.slice(0, end);
}

/**
 * 脆弱性 ID ごとの抑止と、その理由に添えられた撤回条件。
 *
 * @remarks
 * 名前を持たない宣言は落とします。抑止する相手が分からない行を一覧へ載せても、読む人が
 * 何を確かめればよいか決められません。
 */
function osvSuppressions(root: string): readonly Suppression[] {
  return read(root, OSV_PATH)
    .split("[[IgnoredVulns]]")
    .slice(1)
    .map((entry) => ({
      source: OSV_PATH,
      subject: quotedValue(entry, "id"),
      condition: quotedValue(entry, "reason"),
    }))
    .filter((entry) => entry.subject !== "");
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
    const trimmed = line.trim();

    if (!trimmed.startsWith("- ")) {
      break;
    }

    const body = trimmed.slice(2);
    const hash = body.indexOf("#");
    const subject = (hash === -1 ? body : body.slice(0, hash)).trim();

    if (subject !== "") {
      entries.push({
        source: WORKSPACE_PATH,
        subject,
        condition: hash === -1 ? "" : body.slice(hash + 1).trim(),
      });
    }
  }

  return entries;
}

/** 動的スキャンの規則ごとの抑止。`#` で始まる行は解説なので落とす。 */
function zapSuppressions(root: string): readonly Suppression[] {
  return read(root, ZAP_PATH)
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .map((line) => {
      const firstTab = line.indexOf("\t");
      const afterSubject = firstTab === -1 ? "" : line.slice(firstTab + 1);
      const secondTab = afterSubject.indexOf("\t");

      return {
        source: ZAP_PATH,
        subject: firstTab === -1 ? line : line.slice(0, firstTab),
        condition: secondTab === -1 ? "" : afterSubject.slice(secondTab + 1),
      };
    })
    .filter((entry) => entry.subject !== "");
}

/**
 * 3 つの面の宣言を 1 つの一覧へ均す。
 *
 * @param root - 読みに行くリポジトリの根。既定は自分が置かれているリポジトリ
 */
export function scanSuppressions(root: string = REPO_ROOT): readonly Suppression[] {
  return [...osvSuppressions(root), ...cooldownSuppressions(root), ...zapSuppressions(root)];
}

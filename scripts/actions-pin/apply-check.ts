// ロックファイルを SSOT にした `uses:` の固定。apply と check は同じ判定関数を
// dryRun で共用し、「検査は通るのに適用結果が違う」乖離が構造的に起きないようにする。
import fs from "node:fs";
import path from "node:path";
import {
  parseUses,
  refKey,
  refPath,
  unparsedUsesLines,
  unsupportedTagLines,
  usesPattern,
} from "./uses-reference.js";

const FILE_MODE = 0o644;

type RewriteResult = {
  out: string;
  // ロックファイルに無い参照キー。
  missing: string[];
  // 実際に `uses:` から参照されたキー。ロックファイル側の孤児判定に使う。
  referenced: string[];
};

export type PinReport = {
  // ロックファイルに未登録の参照キー（`owner/repo@tag` 形式。ファイルパスではない）。
  missing: string[];
  // ロックファイル通りに固定されていないファイル（リポジトリ相対パス）。dryRun のときだけ埋まる。
  drifted: string[];
  // 書き換えたファイル（リポジトリ相対パス）。dryRun のときと中断時は空。
  updated: string[];
  // ロックファイルにあるがどの `uses:` からも参照されないキー。
  orphans: string[];
  // 対応記法の外にあり解釈できなかった `uses:` の位置（`<相対パス>:<行番号>`）。
  unparsed: string[];
  // 版に使えない文字を含む `uses:` の位置（`<相対パス>:<行番号>`）。
  unsupportedTags: string[];
};

// ロックファイルを元に `uses:` を `@<sha> # <tag>` へ固定した内容を返す。
export function rewritePins(data: string, lock: Map<string, string>): RewriteResult {
  const missing: string[] = [];
  const referenced: string[] = [];
  const out = data.replace(
    usesPattern(),
    (line: string, prefix: string, usesPath: string, ref: string, comment?: string) => {
      const action = parseUses(usesPath, ref, comment);
      if (!action) return line;
      const key = refKey(action);
      referenced.push(key);
      const sha = lock.get(key);
      if (sha === undefined) {
        missing.push(key);
        return line;
      }
      return `${prefix}${refPath(action)}@${sha} # ${action.tag}`;
    },
  );
  return { out, missing, referenced };
}

// dryRun=false なら各ファイルを固定し、true なら書き換えずに差分を報告する。
//
// 全ファイルを読み切って可否を確定させてから書き込む二段構えにしている。ファイル単位で
// 逐次書くと、後続ファイルで未登録が見つかって中断したときに、先行ファイルだけ書き換わった
// 作業ツリーが残る（コマンドは失敗したのに変更は入っている状態になる）。
export function applyPins(
  root: string,
  files: string[],
  lock: Map<string, string>,
  dryRun: boolean,
): PinReport {
  const missing = new Set<string>();
  const referenced = new Set<string>();
  const unparsed: string[] = [];
  const unsupportedTags: string[] = [];
  const pending: { file: string; out: string }[] = [];

  for (const file of files) {
    const data = fs.readFileSync(file, "utf8");
    const relative = path.relative(root, file);
    for (const line of unparsedUsesLines(data)) unparsed.push(`${relative}:${line}`);
    for (const line of unsupportedTagLines(data)) unsupportedTags.push(`${relative}:${line}`);

    const result = rewritePins(data, lock);
    for (const key of result.missing) missing.add(key);
    for (const key of result.referenced) referenced.add(key);
    if (result.out !== data) pending.push({ file, out: result.out });
  }

  const orphans = [...lock.keys()].filter((key) => !referenced.has(key)).sort();
  const blocked =
    missing.size > 0 || orphans.length > 0 || unparsed.length > 0 || unsupportedTags.length > 0;

  const updated: string[] = [];
  if (!dryRun && !blocked) {
    for (const entry of pending) {
      fs.writeFileSync(entry.file, entry.out, { mode: FILE_MODE });
      updated.push(path.relative(root, entry.file));
    }
  }

  return {
    missing: [...missing].sort(),
    drifted: dryRun ? pending.map((entry) => path.relative(root, entry.file)).sort() : [],
    updated: updated.sort(),
    orphans,
    unparsed: unparsed.sort(),
    unsupportedTags: unsupportedTags.sort(),
  };
}

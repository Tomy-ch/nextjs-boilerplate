// ロックファイルを SSOT にした image 参照の固定。apply と check は同じ判定関数を dryRun で
// 共用し、「検査は通るのに適用結果が違う」乖離が構造的に起きないようにする。
import fs from "node:fs";
import path from "node:path";
import {
  type ImageRef,
  type PinTarget,
  parseRef,
  refKey,
  unparsedLines,
} from "./image-reference.js";

const FILE_MODE = 0o644;

type RewriteResult = {
  out: string;
  // ロックファイルに無い参照キー。
  missing: string[];
  // 実際に参照されたキー。ロックファイル側の孤児判定に使う。
  referenced: string[];
};

export type PinReport = {
  // ロックファイルに未登録の参照キー（`image:tag` 形式。ファイルパスではない）。
  missing: string[];
  // ロックファイル通りに固定されていないファイル（リポジトリ相対パス）。dryRun のときだけ埋まる。
  drifted: string[];
  // 書き換えたファイル（リポジトリ相対パス）。dryRun のときと中断時は空。
  updated: string[];
  // ロックファイルにあるがどこからも参照されないキー。
  orphans: string[];
  // 対応記法の外にあり解釈できなかった参照の位置（`<相対パス>:<行番号>`）。
  unparsed: string[];
};

/** ロックファイルを元に、参照を `image:tag@sha256:...` へ固定した内容を返す。 */
export function rewritePins(
  data: string,
  target: PinTarget,
  lock: Map<string, string>,
): RewriteResult {
  const missing: string[] = [];
  const referenced: string[] = [];
  const out = data.replace(
    target.pattern,
    (line: string, prefix: string, reference: string, suffix: string) => {
      const image = parseRef(reference);
      if (!image) return line;
      const key = refKey(image);
      referenced.push(key);
      const digest = lock.get(key);
      if (digest === undefined) {
        missing.push(key);

        return line;
      }

      return `${prefix}${pinned(image, digest)}${suffix}`;
    },
  );

  return { out, missing, referenced };
}

/**
 * dryRun=false なら各ファイルを固定し、true なら書き換えずに差分を報告する。
 *
 * @remarks
 * 全ファイルを読み切って可否を確定させてから書き込みます。ファイル単位で逐次書くと、後続
 * ファイルで未登録が見つかって中断したときに、先行ファイルだけ書き換わった作業ツリーが
 * 残ります（コマンドは失敗したのに変更は入っている状態になる）。
 */
export function applyPins(
  root: string,
  targets: PinTarget[],
  lock: Map<string, string>,
  dryRun: boolean,
): PinReport {
  const missing = new Set<string>();
  const referenced = new Set<string>();
  const unparsed: string[] = [];
  const pending: { file: string; out: string }[] = [];

  for (const target of targets) {
    const data = fs.readFileSync(target.file, "utf8");
    const relative = path.relative(root, target.file);
    for (const line of unparsedLines(data, target)) unparsed.push(`${relative}:${line}`);

    const result = rewritePins(data, target, lock);
    for (const key of result.missing) missing.add(key);
    for (const key of result.referenced) referenced.add(key);
    if (result.out !== data) pending.push({ file: target.file, out: result.out });
  }

  const orphans = [...lock.keys()].filter((key) => !referenced.has(key)).sort();
  const blocked = missing.size > 0 || orphans.length > 0 || unparsed.length > 0;

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
  };
}

function pinned(image: ImageRef, digest: string): string {
  return `${refKey(image)}@${digest}`;
}

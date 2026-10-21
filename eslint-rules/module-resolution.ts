import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import ts from "typescript";

/** import の綴りに足して実ファイルを探す接尾辞。 */
const MODULE_SUFFIXES: readonly string[] = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * import の綴りから、拡張子を除いた実ファイルの位置を組む。組めない綴りは `undefined`。
 *
 * 扱うのは別名（`@/`）と相対だけで、素の package 名はここで落ちる。
 *
 * @param specifier - import の綴り
 * @param filename - 綴りを書いたファイル。相対の綴りはここを起点にする
 * @param cwd - リポジトリの根
 * @returns 拡張子を除いた実ファイルの位置
 */
function moduleBase(specifier: string, filename: string, cwd: string): string | undefined {
  if (specifier.startsWith("@/")) {
    return join(cwd, "src", specifier.slice("@/".length));
  }

  if (specifier.startsWith(".")) {
    return resolve(dirname(filename), specifier);
  }

  return undefined;
}

/**
 * import の綴りを実ファイルへ解決する。解決できなければ `undefined`。
 *
 * 見るのはこのリポジトリのソースだけである。依存パッケージは呼び出し側が探す宣言を持たない
 * うえ、解決に `node_modules` の探索が要る。相対の綴りは `filename` を起点に解決するので、
 * 1 段先を読むときは綴りを書いた 1 段目のファイルを渡す。
 *
 * @param specifier - import の綴り
 * @param filename - 綴りを書いたファイル
 * @param cwd - リポジトリの根
 * @returns 実ファイルの絶対パス
 */
export function resolveModule(
  specifier: string,
  filename: string,
  cwd: string,
): string | undefined {
  const base = moduleBase(specifier, filename, cwd);

  if (base === undefined) {
    return undefined;
  }

  return MODULE_SUFFIXES.map((suffix) => `${base}${suffix}`).find((candidate) =>
    existsSync(candidate),
  );
}

/**
 * ソースが指しているモジュールの綴りを、出てきた順に並べる。
 *
 * 静的な `import … from` / `export … from`、副作用だけの `import "…"`、動的な `import("…")` を
 * 拾う。1 段先のファイルは lint の対象ではなく ESLint が構文木を渡さないので、`typescript` の
 * 字句解析で読む。コメントと文字列の中の綴りは拾わない。
 *
 * @param source - モジュールのソース
 * @returns 出てきた順の綴り
 */
export function moduleSpecifiers(source: string): readonly string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((file) => file.fileName);
}

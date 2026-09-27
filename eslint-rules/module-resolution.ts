import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** import 先の候補になる拡張子。 */
const MODULE_SUFFIXES: readonly string[] = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * ソースの中でモジュールを指している綴り。
 *
 * 静的な `import … from` / `export … from`、副作用だけの `import "…"`、動的な `import("…")` を
 * 拾う。構文木を組まずに読むのは、1 段先のファイルは lint の対象ではなく、ESLint が構文木を
 * 渡さないためである。
 */
const MODULE_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

/**
 * import の綴りから、拡張子を除いた実ファイルの位置を組む。組めない綴りは `undefined`。
 *
 * 扱うのは別名（`@/`）と相対だけで、素の package 名はここで落ちる。
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
 * 見るのはこのリポジトリのソースだけである。依存パッケージは取得の口を持たないうえ、解決に
 * `node_modules` の探索が要る。相対の綴りは `filename` を起点に解決するので、1 段先を読むときは
 * 綴りを書いた 1 段目のファイルを渡す。
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

/** ソースが指しているモジュールの綴りを、出てきた順に並べる。 */
export function moduleSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(MODULE_SPECIFIER)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

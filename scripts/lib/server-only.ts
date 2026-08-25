// server 専用として名乗った module が、client の束へ入ることを止める番人を持っているかの判定。

/** 走査する module 1 件。 */
export type ServerModule = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  readonly content: string;
};

/** 番人を欠いた module。 */
export type UnguardedModule = {
  /** 欠けている module。 */
  readonly path: string;
  /** 何を欠いているか。番人が無いのか、import の先頭に無いのか。 */
  readonly reason: "missing" | "not-first";
};

/** server 専用と名乗る綴り。 */
const SERVER_MODULE = /\.server\.tsx?$/;

/** 番人そのもの。 */
const GUARD = /^\s*import\s+["']server-only["']\s*;?\s*$/;

/** 何かを引いている行。副作用だけの import も含む。 */
const IMPORT = /^\s*(?:import|export)\s[\s\S]*?from\s|^\s*import\s+["']/;

/**
 * 名乗りに対して番人が居るかを見る。
 *
 * @remarks
 * 綴りの側（`*.server.ts`）だけを見ます。逆向き —— 番人を持つ module がその綴りを名乗っているか
 * —— は検査しません。`adapters/server` は層まるごとが server 専用で
 * （[0024](../../docs/adr/0024-adapters-server-client-split.md)）、綴りではなく置き場が
 * それを表しているためです。
 *
 * 番人を **import の先頭**に要求するのは
 * [0030](../../docs/adr/0030-environment-variable-management.md) の「先頭に置く」です。位置が
 * ずれても build は同じく落ちますが、読む側が「この module は server 専用か」を確かめる場所が
 * module ごとに変わります。
 *
 * @param modules - 走査対象。テストと story は呼び出し側で外しておく。
 */
export function findUnguardedServerModules(modules: readonly ServerModule[]): UnguardedModule[] {
  const found: UnguardedModule[] = [];

  for (const module of modules) {
    if (!SERVER_MODULE.test(module.path)) {
      continue;
    }

    const lines = module.content.split("\n");
    const guardAt = lines.findIndex((line) => GUARD.test(line));

    if (guardAt < 0) {
      found.push({ path: module.path, reason: "missing" });
      continue;
    }

    const firstImportAt = lines.findIndex((line) => IMPORT.test(line));

    if (firstImportAt >= 0 && firstImportAt < guardAt) {
      found.push({ path: module.path, reason: "not-first" });
    }
  }

  return found;
}

/** 見つかったものを人が読む形にする。 */
export function formatUnguardedServerModules(found: readonly UnguardedModule[]): string {
  return found
    .map(
      ({ path, reason }) =>
        `${path}: ${
          reason === "missing"
            ? 'import "server-only" がありません'
            : 'import "server-only" が import の先頭にありません'
        }`,
    )
    .sort()
    .join("\n");
}

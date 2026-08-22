// client へ届く module が、重い検証の入口を引いていないかの判定。

/** 走査する module 1 件。 */
export type SourceModule = {
  /** リポジトリルート相対のパス。 */
  readonly path: string;
  /** 中身。 */
  readonly content: string;
};

/** 引いてはいけない入口を引いている module。 */
export type HeavyImport = {
  /** 引いている module。 */
  readonly path: string;
  /** 引いている先。 */
  readonly specifier: string;
  /** どの根から辿り着いたか。読む人が経路を追える。 */
  readonly from: string;
};

/** client の島の入口。 */
const CLIENT_ENTRY = /^\s*["']use client["']/;

/** server 側で切れる境界。ここから先は client bundle に載らない。 */
const SERVER_BOUNDARY = /^\s*["']use server["']|import\s+["']server-only["']/;

/**
 * 実行時に消える import。
 *
 * @remarks
 * 型だけの import は辺になりません。数えると、client に載らない module まで違反として挙がります。
 */
const TYPE_ONLY = /^\s*(?:import|export)\s+type\s[^;]*?;/gm;

/** 引いた先を挙げる。 */
const SPECIFIER = /from\s+["']([^"']+)["']/g;

/**
 * client へ載せてはいけない入口。
 *
 * @remarks
 * - `zod` の既定の入口は、この repository が呼ばない JSON Schema 変換とエラー文言の locale を抱える
 *   ([0029](../../docs/adr/0029-type-design-discipline.md) §2)。client へ届くスキーマは `zod/mini`
 * - 生成した zod スキーマは、契約の全エンドポイントぶんと説明文を持つ。**上限値の定数を取るために
 *   引くと、それが丸ごとブラウザへ配られる**。定数は `limits.ts` が持つ
 */
const FORBIDDEN: readonly {
  readonly test: (specifier: string) => boolean;
  readonly why: string;
}[] = [
  { test: (s) => s === "zod", why: "zod の既定の入口" },
  { test: (s) => /gen\/[^/]+\/endpoints\.zod$/.test(s), why: "生成した zod スキーマ" },
];

/** その module が client の島の入口か。 */
export function isClientEntry(content: string): boolean {
  return CLIENT_ENTRY.test(content);
}

/** その module から先が client bundle に載るか。 */
export function crossesServerBoundary(content: string): boolean {
  return SERVER_BOUNDARY.test(content);
}

/** 実行時に残る import 先を挙げる。 */
export function runtimeSpecifiers(content: string): string[] {
  return [...content.replace(TYPE_ONLY, "").matchAll(SPECIFIER)].map(([, specifier]) => specifier);
}

/**
 * client から到達する module のうち、重い入口を引いているものを挙げる。
 *
 * @param modules - 走査対象。`resolve` が辿れる範囲がそのまま検査の範囲になる。
 * @param resolve - import 先をパスへ解決する。解決できない場合は null。
 *
 * @remarks
 * **`"use client"` を根として辿ります。** 「どのディレクトリに置いてあるか」では判定できません ——
 * `model` も `adapters/client` も、client から引かれた瞬間に bundle へ載るためです。
 */
export function findHeavyClientImports(
  modules: readonly SourceModule[],
  resolve: (from: string, specifier: string) => string | null,
): HeavyImport[] {
  const byPath = new Map(modules.map((module) => [module.path, module]));
  const seen = new Set<string>();
  const found: HeavyImport[] = [];
  const queue = modules
    .filter((module) => isClientEntry(module.content))
    .map((module) => ({ path: module.path, from: module.path }));

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === undefined || seen.has(current.path)) {
      continue;
    }

    seen.add(current.path);

    const module = byPath.get(current.path);

    if (module === undefined || crossesServerBoundary(module.content)) {
      continue;
    }

    for (const specifier of runtimeSpecifiers(module.content)) {
      const forbidden = FORBIDDEN.find((rule) => rule.test(specifier));

      if (forbidden !== undefined) {
        found.push({ path: module.path, specifier, from: current.from });
        continue;
      }

      const target = resolve(module.path, specifier);

      if (target !== null && !seen.has(target)) {
        queue.push({ path: target, from: current.from });
      }
    }
  }

  return found;
}

/** 見つかったものを人が読む形にする。 */
export function formatHeavyClientImports(found: readonly HeavyImport[]): string {
  return found
    .map((entry) => `${entry.path}: ${entry.specifier}（${entry.from} から到達）`)
    .sort()
    .join("\n");
}

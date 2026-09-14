import {
  BOUNDARY_ELEMENTS,
  DEPENDENCIES,
  type ElementDependency,
  KERNEL_PATTERNS,
  KERNELS,
} from "../../architecture";
import { toPathPattern } from "../lib/path-pattern";

/** 境界を宣言してよい場所と、そこが宣言すべき依存。 */
export type DeclarationSite = {
  /** 要素の型。失敗の文言に載せ、どの要素として解決されたかを読めるようにする。 */
  readonly type: string;
  /** その要素が import してよい層。 */
  readonly dependencies: readonly ElementDependency[];
};

/**
 * 境界を宣言してよい場所を、狭いものから順に並べた表。
 *
 * @remarks
 * 基は `architecture.ts` の {@link BOUNDARY_ELEMENTS} で、要素の根がそのまま宣言の置き場です。
 *
 * **足しているのは `KERNEL_PATTERNS` が粒度を狭めている層の根だけです。** `features` の要素は
 * `src/features/*`（スライスごと）なので、層そのものの根はどの要素の根でもなくなり、足さないと
 * `src/features/README.md` が宣言できる場所を失います。狭めていない層はここへ足しません ——
 * `BOUNDARY_ELEMENTS` が既に `src/<kernel>` を持っており、足すと同じ場所へ同じ答えを返す行が
 * 並ぶだけで、読む側には「なぜ 2 つあるのか」だけが残ります。
 */
const DECLARATION_SITES: readonly (DeclarationSite & { readonly matches: RegExp })[] = [
  ...BOUNDARY_ELEMENTS.map(({ type, pattern, dependencies }) => ({
    matches: toPathPattern(pattern),
    type,
    dependencies,
  })),
  ...KERNELS.filter((kernel) => KERNEL_PATTERNS[kernel] !== undefined).map((kernel) => ({
    matches: toPathPattern(`src/${kernel}`),
    type: kernel,
    dependencies: DEPENDENCIES[kernel],
  })),
];

/**
 * ディレクトリが境界を宣言してよい場所かを解決する。
 *
 * @param directory - リポジトリルート相対のディレクトリ（区切りは `/`）
 * @returns 要素の根でなければ null
 */
export function resolveDeclarationSite(directory: string): DeclarationSite | null {
  const site = DECLARATION_SITES.find(({ matches }) => matches.test(directory));

  return site === undefined ? null : { type: site.type, dependencies: site.dependencies };
}

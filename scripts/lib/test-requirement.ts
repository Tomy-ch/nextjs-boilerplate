/**
 * テストが負う層別責務の解決。
 *
 * @remarks
 * どの層の責務を負うかは、テストから遡って最も近い `README.md` の frontmatter が宣言する
 * ([0090](../../docs/adr/0090-testing-strategy.md))。ここが持つのはその解決規則だけで、
 * ツリーの走査は `scripts/test-requirement.gate.test.ts` が担う。
 */

import { parseFrontmatter } from "./frontmatter";

/**
 * 宣言できる層。
 *
 * @remarks
 * [0090](../../docs/adr/0090-testing-strategy.md) の層別責務表と揃える。`visual` を含めないのは、
 * 対象が実装モジュールではなく story であり、宣言を持たないと同 ADR が定めているため。
 */
const TEST_LAYERS = ["unit", "component", "feature", "route", "integration", "e2e"] as const;

/** 宣言できる層。 */
export type TestLayer = (typeof TEST_LAYERS)[number];

/**
 * README を持たないまま宣言を負う入口。
 *
 * @remarks
 * `src/proxy.ts` / `src/instrumentation.ts` は起動 / 境界エントリで、どのカーネルにも属さないため
 * README の walk に乗らない([0021](../../docs/adr/0021-frontend-responsibility.md))。層を持たない
 * ディレクトリへ README を置いて宣言すると、そこに層があることになってしまうので、
 * [0090](../../docs/adr/0090-testing-strategy.md) が直接持つ宣言をここへ写して機械が読める形にする。
 *
 * ここから外れるのは、その入口がカーネルの内側へ移ったとき。
 */
const ENTRY_DECLARATIONS: ReadonlyMap<string, TestLayer> = new Map([
  ["src/instrumentation.test.ts", "unit"],
  ["src/proxy.test.ts", "unit"],
]);

/** 入口宣言の出所。README ではなく ADR が持つため、報告にはこの経路を出す。 */
const ENTRY_DECLARATION_SOURCE = "docs/adr/0090-testing-strategy.md";

/** frontmatter で層を宣言するキー。 */
const DECLARATION_KEY = "test-requirement";

function isTestLayer(value: unknown): value is TestLayer {
  return TEST_LAYERS.some((layer) => layer === value);
}

/**
 * README の frontmatter が宣言する層を読む。
 *
 * @remarks
 * 1 つのディレクトリが複数の層を抱えるときは並びで宣言する。負う責務が割れているのに 1 つしか
 * 書けないと、書かなかった側の観点を誰も負わなくなる([0090](../../docs/adr/0090-testing-strategy.md))。
 *
 * @returns 宣言が無ければ null。宣言があっても層として読めなければ空の並び
 */
function parseTestRequirement(source: string): readonly TestLayer[] | null {
  const frontmatter = parseFrontmatter(source);

  if (frontmatter === null || !(DECLARATION_KEY in frontmatter)) {
    return null;
  }

  const declared = frontmatter[DECLARATION_KEY];

  return (Array.isArray(declared) ? declared : [declared]).filter(isTestLayer);
}

/** ディレクトリ(リポジトリルート相対)の README を読む。無ければ null。 */
export type ReadmeReader = (directory: string) => string | null;

/** 宣言が見つかった場所と、そこが宣言している層。 */
export type ResolvedTestRequirement = {
  /** 宣言を持つ文書(リポジトリルート相対)。 */
  readonly declaredIn: string;
  /** 宣言された層。宣言はあるが層として読めなければ空。 */
  readonly layers: readonly TestLayer[];
};

/**
 * テストファイルを支配する宣言を解決する。
 *
 * @remarks
 * 遡って**最初に宣言を持つ** README を採る。宣言を持たない README は素通しする。README が在ることと
 * 責務を宣言していることは別で、素通ししないと途中の 1 枚が上位の宣言を遮る。
 *
 * @param testFile - テストファイル(リポジトリルート相対、区切りは `/`)
 * @param readReadme - ディレクトリの README を読む
 * @returns 宣言が見つからなければ null
 */
export function resolveTestRequirement(
  testFile: string,
  readReadme: ReadmeReader,
): ResolvedTestRequirement | null {
  const entry = ENTRY_DECLARATIONS.get(testFile);

  if (entry !== undefined) {
    return { declaredIn: ENTRY_DECLARATION_SOURCE, layers: [entry] };
  }

  const segments = testFile.split("/").slice(0, -1);

  for (let depth = segments.length; depth >= 0; depth -= 1) {
    const directory = segments.slice(0, depth).join("/");
    const source = readReadme(directory);

    if (source === null) {
      continue;
    }

    const layers = parseTestRequirement(source);

    if (layers !== null) {
      return { declaredIn: directory === "" ? "README.md" : `${directory}/README.md`, layers };
    }
  }

  return null;
}

/**
 * 宣言を引けなかったテストを、置かれているディレクトリごとにまとめる。
 *
 * @remarks
 * 宣言が**空**のものも引けなかった側へ入れる。`test-requirement` の行はあるが層として読めない
 * 状態で、宣言したつもりで何も宣言できていない。素通しすると、書いた側だけが宣言済みだと思う。
 *
 * @param testFiles - テストファイル(リポジトリルート相対、区切りは `/`)
 * @param readReadme - ディレクトリの README を読む
 * @returns 宣言を引けなかったディレクトリ。重複を畳み、名前順に並ぶ
 */
export function findUndeclaredDirectories(
  testFiles: readonly string[],
  readReadme: ReadmeReader,
): string[] {
  const undeclared = new Set<string>();

  for (const file of testFiles) {
    const resolved = resolveTestRequirement(file, readReadme);

    if (resolved === null || resolved.layers.length === 0) {
      undeclared.add(file.split("/").slice(0, -1).join("/"));
    }
  }

  return [...undeclared].sort();
}

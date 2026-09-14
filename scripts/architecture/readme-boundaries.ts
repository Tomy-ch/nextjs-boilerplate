import { parse } from "yaml";
import { z } from "zod";

import { type ElementDependency, KERNELS } from "../../architecture";
import { extractFrontmatter } from "../lib/frontmatter";

/**
 * 層 README の frontmatter が宣言する境界。
 *
 * @remarks
 * `test-requirement` と `coverage-exclusions` は見ません。**キーによってスコープが違います** ——
 * 境界は要素に付き、検証とカバレッジはディレクトリに付きます。同じ frontmatter に並んでいても、
 * 誰が宣言してよいかが違うので、境界の検査はこの 2 つを対象にしません。
 */
const boundaryFrontmatterSchema = z.object({
  "imports-allowed": z.array(z.string()),
  forbidden: z.array(z.string()),
});

export type BoundaryFrontmatter = z.infer<typeof boundaryFrontmatterSchema>;

/**
 * 生成物であることを行に残す印。
 *
 * @remarks
 * **`linguist-generated` はファイル単位なので、この行には付けられません。** 層 README は
 * 生成物（`imports-allowed`）と手書き（`forbidden` 以下）が同居するため、ファイルを生成物として
 * 宣言することも、手書きとして宣言することもできません。印を行へ置くのは、手で直そうとした人が
 * その場で気づける唯一の位置だからです。
 */
const GENERATED_MARKER = "# 生成物。`pnpm gen:architecture` で直す";

/** `imports-allowed` のフロー形式の 1 行。ブロック形式は当たらない。 */
const IMPORTS_ALLOWED_LINE = /^imports-allowed:\s*\[[^\]]*\].*$/m;

/**
 * README 冒頭の frontmatter から境界宣言を取り出す。
 *
 * @remarks
 * frontmatter が無い、または境界のキーを欠く README は拒否します。宣言の欠落を空の宣言として
 * 素通しすると、「何も import できない層」と区別が付かなくなるためです。
 */
export function parseBoundaryFrontmatter(source: string): BoundaryFrontmatter {
  const block = extractFrontmatter(source);

  if (block === null) {
    throw new Error("先頭に frontmatter (`---` で囲まれたブロック) がありません");
  }

  return boundaryFrontmatterSchema.parse(parse(block));
}

/** 境界のキーを 1 つでも持つか。値が読めるかは {@link parseBoundaryFrontmatter} が見る。 */
export function declaresBoundary(source: string): boolean {
  const block = extractFrontmatter(source);

  return block !== null && /^(?:imports-allowed|forbidden):/m.test(block);
}

/** 生成する `imports-allowed` の 1 行。依存表の並びをそのまま写し、行に印を残す。 */
export function renderImportsAllowed(dependencies: readonly string[]): string {
  return `imports-allowed: [${dependencies.join(", ")}] ${GENERATED_MARKER}`;
}

/**
 * `imports-allowed` の行を生成結果へ揃えた本文を返す。
 *
 * @remarks
 * ブロック形式（`imports-allowed:` の下に `- model` が続く形）は 1 行目だけが置き換わり、残りが
 * 孤立した項目として残って YAML が壊れます。
 *
 * **`forbidden` を人が書く以上、境界のキーは対にして人が起こします** —— 片方だけを機械が挿すと、
 * 対の片割れを欠いた frontmatter が生成の結果として残ります。
 *
 * @returns 揃えた本文。フロー形式の `imports-allowed` の行が無ければ null
 */
export function applyImportsAllowed(
  source: string,
  dependencies: readonly ElementDependency[],
): string | null {
  const block = extractFrontmatter(source);

  if (block === null || !IMPORTS_ALLOWED_LINE.test(block)) {
    return null;
  }

  const rewritten = block.replace(IMPORTS_ALLOWED_LINE, renderImportsAllowed(dependencies));

  return rewritten === block ? source : source.replace(block, () => rewritten);
}

/**
 * 宣言と要素の依存の差分を返す。空配列なら一致している。
 *
 * @remarks
 * **`imports-allowed` は生成し直した結果と本文ごと突き合わせます。** 集合ではなく描画結果を
 * 比べるので、並びの違いも生成物の印の欠落も同じ 1 つの差分になり、直し方も生成し直すこと 1 つに
 * なります。
 *
 * `forbidden` は層名以外の語彙 (`fetch` / `business-logic` など) も含む散文寄りの列なので、層名と
 * して解釈できる要素だけを検査対象にします。
 */
export function findBoundaryDrift(
  dependencies: readonly ElementDependency[],
  source: string,
  declaration: BoundaryFrontmatter,
): string[] {
  const drift: string[] = [];
  const formatted = applyImportsAllowed(source, dependencies);

  if (formatted === null) {
    drift.push(
      "imports-allowed がフロー形式 (`imports-allowed: [a, b]`) の 1 行で見つかりません。ブロック形式は生成できないので、1 行へ直してください",
    );
  } else if (formatted !== source) {
    drift.push(
      `imports-allowed が生成結果と違います (期待: \`${renderImportsAllowed(dependencies)}\`)。\`pnpm gen:architecture\` で生成し直してください`,
    );
  }

  const allowed = new Set<string>(dependencies);
  const contradicting = declaration.forbidden.filter(
    (type) => KERNELS.some((kernelName) => kernelName === type) && allowed.has(type),
  );

  if (contradicting.length) {
    drift.push(`${contradicting.join(", ")} を許可と禁止の両方に挙げています`);
  }

  return drift;
}

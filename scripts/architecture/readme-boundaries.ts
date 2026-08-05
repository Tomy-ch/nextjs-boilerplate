import { parse } from "yaml";
import { z } from "zod";

import { DEPENDENCIES, KERNELS, type Kernel } from "../../architecture";

/** 層 README の frontmatter が宣言する境界。`test-requirement` は境界の宣言ではないため見ない。 */
export const boundaryFrontmatterSchema = z.object({
  "imports-allowed": z.array(z.string()),
  forbidden: z.array(z.string()),
});

export type BoundaryFrontmatter = z.infer<typeof boundaryFrontmatterSchema>;

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

/**
 * README 冒頭の frontmatter から境界宣言を取り出す。
 *
 * @remarks
 * frontmatter が無い、または境界のキーを欠く README は拒否します。宣言の欠落を空の宣言として
 * 素通しすると、「何も import できない層」と区別が付かなくなるためです。
 */
export function parseBoundaryFrontmatter(source: string): BoundaryFrontmatter {
  const matched = FRONTMATTER_PATTERN.exec(source);

  if (!matched) {
    throw new Error("先頭に frontmatter (`---` で囲まれたブロック) がありません");
  }

  return boundaryFrontmatterSchema.parse(parse(matched[1]));
}

/**
 * 宣言と `architecture.ts` の差分を返す。空配列なら一致している。
 *
 * @remarks
 * `forbidden` は層名以外の語彙 (`fetch` / `business-logic` など) も含む散文寄りの列なので、
 * 層名として解釈できる要素だけを検査対象にします。
 */
export function findBoundaryDrift(kernel: Kernel, declaration: BoundaryFrontmatter): string[] {
  const drift: string[] = [];
  const declared = new Set(declaration["imports-allowed"]);
  const expected = new Set<string>(DEPENDENCIES[kernel]);

  const missing = [...expected].filter((type) => !declared.has(type));
  const extra = [...declared].filter((type) => !expected.has(type));

  if (missing.length) {
    drift.push(`imports-allowed に ${missing.join(", ")} がありません`);
  }

  if (extra.length) {
    drift.push(`imports-allowed の ${extra.join(", ")} は architecture.ts が許していません`);
  }

  const contradicting = declaration.forbidden.filter(
    (type) => KERNELS.some((kernelName) => kernelName === type) && declared.has(type),
  );

  if (contradicting.length) {
    drift.push(`${contradicting.join(", ")} を許可と禁止の両方に挙げています`);
  }

  return drift;
}

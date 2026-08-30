/**
 * 手元で開く節を組み立てる。
 *
 * @remarks
 * コマンド 1 行を組むのは [`review-command.ts`](./review-command.ts) で、ここが持つのは**節に
 * するかどうか**です。貼れない値が混ざったときは案内ごと出しません —— 案内だけを残すと、読み手は
 * 在るはずのコマンドを探すことになります。
 */

import {
  composeReviewCommand,
  REVIEW_KIND,
  REVIEW_WORKTREE_NOTE,
  type ReviewKind,
} from "./review-command.js";

/** {@link composeReviewBlock} が受け取るもの。 */
export type ReviewBlockInput = {
  /** 開く対象の種類。表に無い綴りは断る。 */
  readonly kind: string;
  /** 対象の id をカンマで並べたもの。 */
  readonly ids: string;
  /** 作業ツリーが指すブランチ。 */
  readonly headRef: string;
  /** 成果物を引く実行。撮り直しの完了コメントは渡さない。 */
  readonly runId?: string;
  /** 節の見出し。深さは置く場所が決める。 */
  readonly heading: string;
  /** 見出しの下に置く 1 行。 */
  readonly lead: string;
};

/** その綴りが開ける対象の種類か。 */
function isReviewKind(value: string): value is ReviewKind {
  return value === REVIEW_KIND.story || value === REVIEW_KIND.screen;
}

/**
 * 手元で開く節を組み立てる。
 *
 * @param input - 対象・差し込む値・見出しと導入
 * @returns markdown の節。組み立てられなければ空文字列
 * @throws 対象の種類が表に無いとき
 */
export function composeReviewBlock(input: ReviewBlockInput): string {
  if (!isReviewKind(input.kind)) {
    throw new Error(`--kind は story か screen です: ${input.kind}`);
  }

  const command = composeReviewCommand({
    kind: input.kind,
    ids: input.ids,
    headRef: input.headRef,
    runId: input.runId,
  });

  if (command === null) {
    return "";
  }

  return [input.heading, input.lead, `\`\`\`bash\n${command}\n\`\`\``, REVIEW_WORKTREE_NOTE].join(
    "\n\n",
  );
}

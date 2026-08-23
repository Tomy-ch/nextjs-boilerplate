// ワークフロー定義の走査。コメント投稿ジョブの同定と、走査対象になる文字列の切り出しを行う。
//
// 定義を読んで `jobs:` へ降りるまでは `../lib/workflow-files.ts` が担う（境界の判定を書式に
// 依存させない理由もそちらが持つ）。ここが持つのは、降りた先の走査である。
//
// 切り出す単位はソースの範囲ではなくスカラーの値。範囲で切ると、YAML コメントが走査対象に
// 残り、alias で他のジョブへ退避させた値は逆に対象から外れる。alias を辿って値へ降りれば、
// どちらの経路も参照先の実体で判定できる。
import {
  type Document,
  isAlias,
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  type Node,
  Scalar,
} from "yaml";

import { parseWorkflowDocument, readJobId, readWorkflowMaps } from "../lib/workflow-files.js";
import { localActionDir } from "./comment-actions.js";
import { collectUsesFromValue, toJS } from "./uses.js";

const JOBS_KEY = "jobs";

// 走査対象の文字列 1 件。
type ScalarText = {
  text: string;
  // この文字列を含むコメント投稿ジョブの ID。ワークフロー全体に及ぶ位置にある場合は null。
  jobId: string | null;
  // text 内のオフセットをワークフローの行番号へ写す。
  lineAt: (offset: number) => number;
};

export type Workflow = {
  file: string;
  postingJobIds: string[];
  texts: ScalarText[];
};

export function parseWorkflow(file: string, source: string, commentDirs: Set<string>): Workflow {
  const lineCounter = new LineCounter();
  const doc = parseWorkflowDocument(file, source, lineCounter);
  const { root, jobs: jobsNode } = readWorkflowMaps(file, doc);
  const jobsValue = (toJS(file, doc) as { jobs?: unknown } | null)?.jobs;
  /* istanbul ignore next -- 直前で jobs: がマッピングであることを確かめているため、解決結果が
     オブジェクトでない経路はこの入口から辿れない。パーサ側の変更で崩れたときに黙って
     「投稿ジョブなし」へ寄らないよう、検査自体は残す。 */
  if (jobsValue === null || typeof jobsValue !== "object") {
    throw new Error(`${file}: jobs: を解決できません`);
  }

  const postingJobIds: string[] = [];
  const texts: ScalarText[] = [];

  // `jobs:` の外に置かれた値（トップレベルの `env:` など）はワークフロー全体に及び、
  // 投稿ジョブにも届くため走査対象に含める。
  for (const pair of root.items) {
    if (isScalar(pair.key) && pair.key.value === JOBS_KEY) continue;
    collectScalars(doc, lineCounter, pair.value, null, texts, new Set());
  }

  for (const pair of jobsNode.items) {
    const id = readJobId(file, pair.key);
    const job = (jobsValue as Record<string, unknown>)[id];
    // reusable workflow の呼び出し先へ渡る secret は追えない。投稿ジョブでないものとして
    // 通すと、検査が届かない経路が緑のまま増える。
    if (typeof (job as { uses?: unknown } | null)?.uses === "string") {
      throw new Error(
        `${file}: ジョブ \`${id}\` は reusable workflow を呼び出しています。呼び出し先へ渡る secret を追えないため、この検査は未対応です`,
      );
    }
    if (!postsComment(job, commentDirs)) continue;
    postingJobIds.push(id);
    collectScalars(doc, lineCounter, pair.value, id, texts, new Set());
  }

  return { file, postingJobIds, texts };
}

function postsComment(job: unknown, commentDirs: Set<string>): boolean {
  const uses: string[] = [];
  collectUsesFromValue(job, uses);
  return uses.some((value) => {
    const dir = localActionDir(value);
    return dir !== null && commentDirs.has(dir);
  });
}

// ノードの下にある文字列スカラーを集める。alias は参照先へ降りるため、他のジョブに置いた
// anchor をこのジョブから参照していても実体に届く。
function collectScalars(
  doc: Document,
  lineCounter: LineCounter,
  node: unknown,
  jobId: string | null,
  out: ScalarText[],
  seen: Set<unknown>,
): void {
  const resolved = resolveAlias(doc, node);
  /* istanbul ignore next -- 循環した anchor は走査より前に通る toJS が解決に失敗して落ちるため、
     この再訪ガードはこの入口から辿れない。走査の入口が増えたときに無限再帰へ落ちないよう残す。 */
  if (!resolved || seen.has(resolved)) return;
  seen.add(resolved);

  if (isScalar(resolved)) {
    if (typeof resolved.value === "string" && resolved.range) {
      out.push({
        text: resolved.value,
        jobId,
        lineAt: lineResolver(lineCounter, resolved),
      });
    }
    return;
  }
  if (isSeq(resolved)) {
    for (const item of resolved.items) {
      collectScalars(doc, lineCounter, item, jobId, out, seen);
    }
    return;
  }
  /* istanbul ignore next -- resolveAlias が返すのはスカラー・シーケンス・マッピングだけで、前 2 つは
     上で return 済み。ここが false になる経路は無いが、返す種類が増えたときに黙って落とさない
     よう分岐として残す。 */
  if (isMap(resolved)) {
    for (const pair of resolved.items) {
      collectScalars(doc, lineCounter, pair.key, jobId, out, seen);
      collectScalars(doc, lineCounter, pair.value, jobId, out, seen);
    }
  }
}

// リテラル（`|`）のブロックスカラーだけは値の行とソースの行が 1 対 1 で対応するため、
// 値の中の位置まで写せる。それ以外の書式は折り畳みや引用符で対応が崩れるので、
// スカラーの開始行を指す。
function lineResolver(lineCounter: LineCounter, scalar: Scalar): (offset: number) => number {
  /* istanbul ignore next -- 走査対象へ入るのは range を持つスカラーだけ（collectScalars が範囲で
     絞っている）。範囲を持たない合成ノードが混ざったときに 0 行目を指して黙らないよう残す。 */
  const start = scalar.range ? lineCounter.linePos(scalar.range[0]).line : 0;
  if (scalar.type !== Scalar.BLOCK_LITERAL) return () => start;
  const firstLine = start + 1;
  return (offset) => firstLine + countNewlines(String(scalar.value).slice(0, offset));
}

function countNewlines(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") count++;
  }
  return count;
}

// alias を参照先のノードへ置き換える。参照先の無い alias は YAML として不正だが、パーサは
// errors に載せず未解決を返す。これを落とすのは走査より前に通る toJS で、fail-close の点を
// 1 つに寄せてある（ここにも同じ検査を置くと、到達しない分岐が検査対象に残る）。
// 値を持たないキー（`key:` だけの行）のように走査対象にならないノードは null を返す。
function resolveAlias(doc: Document, node: unknown): Node | null {
  let current = node;
  while (isAlias(current)) {
    current = current.resolve(doc);
  }
  /* istanbul ignore next -- スカラー・マッピング・シーケンスのいずれでもないノードは、この入口が
     渡す木には現れない。パーサが新しいノード種を返したときに素通りさせないよう残す。 */
  return isScalar(current) || isMap(current) || isSeq(current) ? current : null;
}

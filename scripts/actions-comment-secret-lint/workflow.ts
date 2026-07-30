// ワークフロー定義の走査。コメント投稿ジョブの同定と、走査対象になる文字列の切り出しを行う。
//
// 走査は YAML パーサで行う。ジョブの境界を行単位の正規表現で判定すると、インデント幅や
// フロー記法といった書式の違いでヘッダが 1 つも一致せず、検査対象が空のまま緑になる。
// 書式に依存しない形にしておけば、fork がワークフローを別の記法で書き直しても検査は残る。
//
// 切り出す単位はソースの範囲ではなくスカラーの値。範囲で切ると、YAML コメントが走査対象に
// 残り、alias で他のジョブへ退避させた値は逆に対象から外れる。alias を辿って値へ降りれば、
// どちらの経路も参照先の実体で判定できる。
import fs from "node:fs";
import path from "node:path";
import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  type Node,
  parseDocument,
  Scalar,
} from "yaml";
import { localActionDir } from "./comment-actions.js";
import { collectUsesFromValue, toJS } from "./uses.js";

export const WORKFLOW_DIR = ".github/workflows";
const WORKFLOW_EXTENSIONS = [".yaml", ".yml"];
const JOBS_KEY = "jobs";

// 走査対象の文字列 1 件。
export type ScalarText = {
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

export function listWorkflowFiles(root: string): string[] {
  const dir = path.join(root, WORKFLOW_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && WORKFLOW_EXTENSIONS.includes(path.extname(entry.name)))
    .map((entry) => `${WORKFLOW_DIR}/${entry.name}`)
    .sort();
}

export function parseWorkflow(file: string, source: string, commentDirs: Set<string>): Workflow {
  const lineCounter = new LineCounter();
  const doc = parseDocument(source, { lineCounter });
  if (doc.errors.length > 0) {
    throw new Error(`${file}: YAML として読めません: ${doc.errors[0].message}`);
  }

  const root = doc.contents;
  if (!isMap(root)) {
    throw new Error(`${file}: ワークフローがマッピングとして読めません`);
  }
  // `jobs:` が読めないワークフローを「投稿ジョブなし」に寄せると、検査対象が黙って
  // 縮んだまま緑になる。読めない形は異常として落とす。
  const jobsNode = doc.getIn([JOBS_KEY], true);
  if (!isMap(jobsNode)) {
    throw new Error(`${file}: jobs: がマッピングとして読めません`);
  }
  const jobsValue = (toJS(file, doc) as { jobs?: unknown } | null)?.jobs;
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
    if (!isScalar(pair.key) || typeof pair.key.value !== "string") {
      throw new Error(`${file}: ジョブ名が文字列として読めません`);
    }
    const id = pair.key.value;
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
  doc: ReturnType<typeof parseDocument>,
  lineCounter: LineCounter,
  node: unknown,
  jobId: string | null,
  out: ScalarText[],
  seen: Set<unknown>,
): void {
  const resolved = resolveAlias(doc, node);
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

// alias を参照先のノードへ置き換える。参照先の無い alias は YAML として不正だが、
// パーサは errors に載せず未解決を返すため、ここで落とす。
function resolveAlias(doc: ReturnType<typeof parseDocument>, node: unknown): Node | null {
  let current = node;
  while (isAlias(current)) {
    const target = current.resolve(doc);
    if (!target) throw new Error(`参照先の無い alias があります: *${current.source}`);
    current = target;
  }
  return isScalar(current) || isMap(current) || isSeq(current) ? current : null;
}

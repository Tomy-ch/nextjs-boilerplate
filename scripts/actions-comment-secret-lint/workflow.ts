// ワークフロー定義の走査。ジョブの切り出しと、コメント投稿ジョブの同定を行う。
//
// 走査は YAML パーサで行う。ジョブの境界を行単位の正規表現で判定すると、インデント幅や
// フロー記法といった書式の違いでヘッダが 1 つも一致せず、検査対象が空のまま緑になる。
// 書式に依存しない形にしておけば、fork がワークフローを別の記法で書き直しても検査は残る。
import fs from "node:fs";
import path from "node:path";
import { isMap, isScalar, LineCounter, parseDocument } from "yaml";
import { localActionDir } from "./comment-actions.js";
import { collectUsesFromValue, toJS } from "./uses.js";

export const WORKFLOW_DIR = ".github/workflows";
const WORKFLOW_EXTENSIONS = [".yaml", ".yml"];

export type WorkflowJob = {
  id: string;
  // コメント投稿 action へ（ローカル action を経由してでも）到達するジョブか。
  posts: boolean;
  // ジョブの定義がソース上で占める範囲 [開始, 終了)。
  start: number;
  end: number;
};

export type Workflow = {
  file: string;
  source: string;
  lineCounter: LineCounter;
  jobs: WorkflowJob[];
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

  // `jobs:` が読めないワークフローを「投稿ジョブなし」に寄せると、検査対象が黙って
  // 縮んだまま緑になる。読めない形は異常として落とす。
  const jobsNode = doc.getIn(["jobs"], true);
  if (!isMap(jobsNode)) {
    throw new Error(`${file}: jobs: がマッピングとして読めません`);
  }
  const jobsValue = (toJS(file, doc) as { jobs?: unknown } | null)?.jobs;
  if (jobsValue === null || typeof jobsValue !== "object") {
    throw new Error(`${file}: jobs: を解決できません`);
  }

  const jobs: WorkflowJob[] = [];
  for (const pair of jobsNode.items) {
    if (!isScalar(pair.key) || typeof pair.key.value !== "string" || !pair.key.range) {
      throw new Error(`${file}: ジョブ名が文字列として読めません`);
    }
    const id = pair.key.value;
    const end = (pair.value as { range?: [number, number, number] } | null)?.range?.[2];
    jobs.push({
      id,
      posts: postsComment((jobsValue as Record<string, unknown>)[id], commentDirs),
      start: pair.key.range[0],
      end: end ?? pair.key.range[2],
    });
  }

  return { file, source, lineCounter, jobs };
}

function postsComment(job: unknown, commentDirs: Set<string>): boolean {
  const uses: string[] = [];
  collectUsesFromValue(job, uses);
  return uses.some((value) => {
    const dir = localActionDir(value);
    return dir !== null && commentDirs.has(dir);
  });
}

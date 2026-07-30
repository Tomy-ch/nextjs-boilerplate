#!/usr/bin/env node

// PR コメントを投稿するジョブに secret が渡っていないかを検査する。
//
// Actions のシークレットマスキングは、ランナーがジョブ出力をログ表示用に捕捉する経路にしか
// 効かない。検査ログを `tee` でファイルへ落としたバイトは素通りするため、そのファイルを本文に
// する `upsert-pr-comment` では、ログ上はマスク済みに見える値でも生のまま公開 PR コメントに
// 載る。マスキングを当てにできない以上「本文を作るジョブに secret を渡さない」を規約として
// 守るしかなく（ADR 0153）、この検査はその規約が将来 `env:` 1 行で破られることへの退行ガード。
//
// `GITHUB_TOKEN` はコメント投稿そのものに必要で、かつ Actions がジョブごとに発行する短命
// トークンなので許可する。
//
// 検出できるのは `${{ }}` 式に現れる secrets コンテキストの直接参照だけ。別ジョブで secret を
// 読んで `needs.<job>.outputs` 経由で渡す間接参照は静的に追えないため、この検査は通る。
import { readFileSync } from "node:fs";
import path from "node:path";
import { collectCommentActions, UPSERT_ACTION_DIR } from "./comment-actions.js";
import { findSecretReferences } from "./secret-reference.js";
import { listWorkflowFiles, parseWorkflow, WORKFLOW_DIR, type Workflow } from "./workflow.js";

const ALLOWED_SECRET = "GITHUB_TOKEN";

type Finding = {
  file: string;
  line: number;
  message: string;
};

function main(): void {
  const root = process.cwd();
  const commentActions = collectCommentActions(root, (absolute) => readFileSync(absolute, "utf8"));

  const files = listWorkflowFiles(root);
  // 検査対象 0 件は「問題なし」ではなく「検査が働いていない」。実行位置の誤りを緑で返さない。
  if (files.length === 0) {
    abort(`${WORKFLOW_DIR}/ にワークフローが見つかりません（リポジトリルートで実行してください）`);
  }

  const findings: Finding[] = [];
  let postingJobs = 0;

  for (const file of files) {
    const workflow = parseWorkflow(
      file,
      readFileSync(path.join(root, file), "utf8"),
      commentActions.dirs,
    );
    const posting = workflow.jobs.filter((job) => job.posts);
    postingJobs += posting.length;
    if (posting.length === 0) continue;

    // 投稿しないジョブの範囲だけを除いて、残り全体（トップレベルの `env:` を含む）を見る。
    // ジョブ本文の外に置かれた secret もワークフロー全体に及び、投稿ジョブへ届くため。
    const excluded = workflow.jobs.filter((job) => !job.posts);
    const isExcluded = (offset: number) =>
      excluded.some((job) => offset >= job.start && offset < job.end);

    for (const reference of findSecretReferences(workflow.source, isExcluded)) {
      if (reference.name?.toUpperCase() === ALLOWED_SECRET) continue;
      findings.push(findingAt(workflow, posting, reference.offset, reference.name));
    }
  }

  // action の定義があるのに投稿ジョブが 1 つも見つからないのは、参照の同定が壊れている
  // ことを意味する。検査対象が消えたまま緑になるのを塞ぐ。
  if (commentActions.defined && postingJobs === 0) {
    abort(
      `${UPSERT_ACTION_DIR} の定義があるのに、それを使うジョブが 1 つも見つかりません（参照の同定が壊れています）`,
    );
  }

  report(files.length, postingJobs, findings);
}

function findingAt(
  workflow: Workflow,
  posting: Workflow["jobs"],
  offset: number,
  name: string | null,
): Finding {
  const { line } = workflow.lineCounter.linePos(offset);
  const job = posting.find((candidate) => offset >= candidate.start && offset < candidate.end);
  const reason = "マスキングは tee したファイルに効かず、生値が公開 PR コメントに載ります";
  const message = job
    ? `ジョブ \`${job.id}\` は PR コメントを投稿するため ${describe(name)} を渡せません（${reason}）`
    : `ワークフロー全体に及ぶ ${describe(name)} は PR コメントを投稿するジョブにも届きます（${reason}）`;
  return { file: workflow.file, line, message };
}

function describe(name: string | null): string {
  return name ? `\`secrets.${name}\`` : "`secrets` コンテキスト全体";
}

function report(workflows: number, postingJobs: number, findings: Finding[]): void {
  if (findings.length === 0) {
    console.log(
      `✅ ワークフロー ${workflows} 件のうち PR コメントを投稿する ${postingJobs} ジョブに secret の混入はありません`,
    );
    return;
  }

  let current: string | null = null;
  for (const finding of findings) {
    if (finding.file !== current) {
      console.error(`  ${finding.file}`);
      current = finding.file;
    }
    console.error(`    :${finding.line}  ${finding.message}`);
  }
  console.error(
    `❌ PR コメントを投稿するジョブへの secret の混入が ${findings.length} 件あります（検査 ${workflows} ワークフロー / ${postingJobs} ジョブ）`,
  );
  process.exit(1);
}

// 検査そのものが成立していない状態。違反（exit 1）とは区別して返す。
function abort(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(2);
}

try {
  main();
} catch (e) {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}

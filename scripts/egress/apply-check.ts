// 宣言を SSOT にした bullfrog の書き換え。apply と check は同じ判定関数を dryRun で
// 共用し、「検査は通るのに適用結果が違う」乖離が構造的に起きないようにする（actions-pin と同形）。
// ここが持つのは workflow の走査と step の差し替えで、step に書く入力は bullfrog-step.ts が持つ。
import { chmodSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { policyBlock, type StepPolicy } from "./bullfrog-step.js";
import { allowedIps, type Declaration, domainsFor, sudoFor } from "./declaration.js";

const FILE_MODE = 0o644;

/** 走査する範囲。bullfrog が立つのは job の冒頭だけなので composite action は含まない。 */
export const WORKFLOW_DIR = ".github/workflows";

const BULLFROG = /^(\s*)uses: bullfrogsec\/bullfrog@/;

const MENTION = "bullfrogsec/bullfrog";

const COMMENT = /^\s*#/;

const JOBS = /^jobs:\s*(#.*)?$/;

const JOB = /^ {2}([A-Za-z0-9_-]+):\s*(#.*)?$/;

const STEPS = /^ {4}steps:\s*(#.*)?$/;

export type RewriteResult = {
  readonly out: string;
  /** 想定した形をしていなかった行番号（1 始まり）。 */
  readonly malformed: number[];
  /** bullfrog の step を持っていた job の名前。 */
  readonly jobs: string[];
  /** `steps:` を持つのに bullfrog の step を持たない job の名前。 */
  readonly missing: string[];
};

/**
 * 1 ファイルの bullfrog を宣言どおりに書き換える。
 *
 * @param data - workflow ファイルの中身
 * @param policyOf - job の名前から、その step に書く方針を返す
 * @returns 書き換えた中身、書き換えられなかった行、bullfrog の step を持つ job と持たない job
 *
 * @remarks
 * 想定する形は次の 3 行で始まる step です。**この形から外れていたら書き換えず、行番号を
 * 返します** —— 部分的に合う塊へ機械的に当てると、別の step を巻き込みかねません。
 * `bullfrogsec/bullfrog` を含むのに `uses:` で始まらない行（`- uses:` と 1 行に詰めた形など）も
 * 同じ扱いです。コメント行は名前を含んでも数えません。`with:` の中身はこの関数が丸ごと持ち、手で足した入力は次の apply で消えます。
 *
 * ```yaml
 * uses: bullfrogsec/bullfrog@<sha> # <tag>
 * with:
 *   egress-policy: <audit|block>
 * ```
 *
 * `steps:` を持つ job に bullfrog が 1 つも無ければ `missing` に挙げます。再利用 workflow を
 * `uses:` で呼ぶ job は `steps:` を持たないので対象外です。
 */
export function rewriteStep(data: string, policyOf: (job: string) => StepPolicy): RewriteResult {
  const lines = data.split("\n");
  const out: string[] = [];
  const malformed: number[] = [];
  const jobs: string[] = [];
  const missing: string[] = [];
  let inJobs = false;
  let job: string | null = null;
  let hasSteps = false;
  let guarded = false;
  // 書き換えた塊の末尾。ここまでは読み飛ばす。
  let consumed = -1;

  const close = (): void => {
    if (job !== null && hasSteps && !guarded) missing.push(job);
    job = null;
    hasSteps = false;
    guarded = false;
  };

  for (const [at, line] of lines.entries()) {
    if (at <= consumed) continue;

    if (JOBS.test(line)) {
      inJobs = true;
    } else if (/^[^\s#]/.test(line)) {
      close();
      inJobs = false;
    }

    const key = inJobs ? JOB.exec(line)?.[1] : undefined;

    if (key !== undefined) {
      close();
      job = key;
    }

    if (job !== null && STEPS.test(line)) hasSteps = true;

    if (!line.includes(MENTION) || COMMENT.test(line)) {
      out.push(line);
      continue;
    }

    guarded = true;

    const indent = indentOf(line);

    if (!BULLFROG.test(line) || !isExpectedShape(lines, at, indent)) {
      malformed.push(at + 1);
      out.push(line);
      continue;
    }

    jobs.push(job ?? "");
    out.push(line, ...policyBlock(indent, policyOf(job ?? "")));
    consumed = endOfStep(lines, at, indent);
  }

  close();

  return { out: out.join("\n"), malformed, jobs, missing };
}

function indentOf(line: string): string {
  return line.slice(0, line.length - line.trimStart().length);
}

/** 書き換えてよい形か。`with:` と `egress-policy:` がこの順で続くことだけを見る。 */
function isExpectedShape(lines: readonly string[], at: number, indent: string): boolean {
  return (
    lines[at + 1] === `${indent}with:` &&
    (lines[at + 2]?.startsWith(`${indent}  egress-policy:`) ?? false)
  );
}

/**
 * 読み飛ばす末尾。`with:` の下で、それより深く字下げされた行が続く限り。
 *
 * @param lines - ファイルの全行
 * @param at - `uses:` の行の位置
 * @param indent - その字下げ
 * @returns step の最後の行の位置
 */
function endOfStep(lines: readonly string[], at: number, indent: string): number {
  let last = at + 1;

  while (lines[last + 1]?.startsWith(`${indent}  `)) last += 1;

  return last;
}

export type EgressReport = {
  /** 宣言どおりに固定されていないファイル（リポジトリ相対）。dryRun のときだけ埋まる。 */
  readonly drifted: string[];
  /** 書き換えたファイル（リポジトリ相対）。dryRun のときは空。 */
  readonly updated: string[];
  /** 想定した形の外にあった位置（`<相対パス>:<行番号>`）。 */
  readonly malformed: string[];
  /** 監査のまま残した workflow の名前。 */
  readonly audited: string[];
  /** bullfrog の step を持っていた job（`<workflow>/<job>`）。 */
  readonly jobs: string[];
  /** `steps:` を持つのに bullfrog の step を持たない job（`<workflow>/<job>`）。 */
  readonly missing: string[];
};

/** `.github/workflows` の定義ファイル名（拡張子を除く）を並べる。 */
export function workflowNames(root: string): string[] {
  return readdirSync(join(root, WORKFLOW_DIR))
    .filter((entry) => entry.endsWith(".yaml"))
    .map((entry) => basename(entry, ".yaml"))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * 全 workflow を宣言と突き合わせる。
 *
 * @param dryRun - `true` なら書かずに差分だけを報告する
 */
export function runEgress(root: string, declaration: Declaration, dryRun: boolean): EgressReport {
  const drifted: string[] = [];
  const updated: string[] = [];
  const malformed: string[] = [];
  const audited: string[] = [];
  const jobs: string[] = [];
  const missing: string[] = [];
  const ips = allowedIps(declaration);

  for (const name of workflowNames(root)) {
    const relative = `${WORKFLOW_DIR}/${name}.yaml`;
    const file = join(root, relative);
    const data = readFileSync(file, "utf8");
    const domains = domainsFor(declaration, name);

    if (domains === null) audited.push(name);

    const result = rewriteStep(data, (job) => ({
      domains,
      ips,
      sudo: sudoFor(declaration, name, job),
    }));

    for (const at of result.malformed) malformed.push(`${relative}:${at}`);
    for (const job of result.jobs) jobs.push(`${name}/${job}`);
    for (const job of result.missing) missing.push(`${name}/${job}`);

    if (result.out === data) continue;

    if (dryRun) {
      drifted.push(relative);
      continue;
    }

    writeFileSync(file, result.out);
    // `mode` は作るときにしか効かない。既にあるファイルの権限は書いた後で揃える。
    chmodSync(file, FILE_MODE);
    updated.push(relative);
  }

  return { drifted, updated, malformed, audited, jobs, missing };
}

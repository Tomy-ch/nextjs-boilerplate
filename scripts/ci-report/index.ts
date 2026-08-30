#!/usr/bin/env node

// 検査が落ちたときに人へ渡す文面を組み立てる入口。
//
//   issue-body   --kind tool-output|authored --evidence <file> --note <file>
//                [--heading <text>] [--run-url <url>]
//   review-block --kind story|screen --ids <csv> --head-ref <branch> --heading <text>
//                --lead <text> [--run-id <id>]
//
// どちらも標準出力へ書く。文面そのもの（案内の散文）は呼び出し側が持ち、ここが持つのは
// 並べ方と、貼れる値かどうかの判定である。
import { readFileSync } from "node:fs";

import { composeIssueBody, type IssueEvidence } from "../lib/issue-body.js";
import { composeReviewCommand, REVIEW_KIND, REVIEW_WORKTREE_NOTE } from "../lib/review-command.js";

/** `--name value` の並びを表に読む。 */
function readOptions(argv: readonly string[]): Map<string, string> {
  const options = new Map<string, string>();

  for (let position = 0; position < argv.length; position += 2) {
    const name = argv[position];
    const value = argv[position + 1];

    if (name === undefined || value === undefined || !name.startsWith("--")) {
      fail(`引数の並びが読めません: ${argv.join(" ")}`);
    }

    options.set(name.slice(2), value);
  }

  return options;
}

function requiredOption(options: Map<string, string>, name: string): string {
  const value = options.get(name);

  if (value === undefined) {
    fail(`--${name} を渡してください`);
  }

  return value;
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function issueBody(options: Map<string, string>): string {
  const kind = requiredOption(options, "kind");

  if (kind !== "tool-output" && kind !== "authored") {
    fail(`--kind は tool-output か authored です: ${kind}`);
  }

  const evidence: IssueEvidence = {
    kind,
    text: readFileSync(requiredOption(options, "evidence"), "utf8").trimEnd(),
  };

  return composeIssueBody({
    heading: options.get("heading"),
    evidence,
    runUrl: options.get("run-url"),
    note: readFileSync(requiredOption(options, "note"), "utf8").trimEnd(),
  });
}

function reviewBlock(options: Map<string, string>): string {
  const kind = requiredOption(options, "kind");

  if (kind !== REVIEW_KIND.story && kind !== REVIEW_KIND.screen) {
    fail(`--kind は story か screen です: ${kind}`);
  }

  const command = composeReviewCommand({
    kind,
    ids: requiredOption(options, "ids"),
    headRef: requiredOption(options, "head-ref"),
    runId: options.get("run-id"),
  });

  // 貼れない値が混ざっていれば節ごと出さない。案内だけを残すと、読み手は在るはずのコマンドを
  // 探すことになる。
  if (command === null) {
    return "";
  }

  return [
    requiredOption(options, "heading"),
    requiredOption(options, "lead"),
    `\`\`\`bash\n${command}\n\`\`\``,
    REVIEW_WORKTREE_NOTE,
  ].join("\n\n");
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const options = readOptions(rest);

  if (command === "issue-body") {
    process.stdout.write(issueBody(options));

    return;
  }

  if (command === "review-block") {
    const block = reviewBlock(options);

    if (block !== "") {
      process.stdout.write(`${block}\n`);
    }

    return;
  }

  fail("usage: ci-report issue-body | ci-report review-block");
}

main();

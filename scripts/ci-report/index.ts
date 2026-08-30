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

import { parseOptions, requireOption } from "../lib/cli-options.js";
import { composeIssueBody, type IssueEvidence } from "../lib/issue-body.js";
import { composeReviewCommand, REVIEW_KIND, REVIEW_WORKTREE_NOTE } from "../lib/review-command.js";

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function issueBody(options: Map<string, string>): string {
  const kind = requireOption(options, "kind");

  if (kind !== "tool-output" && kind !== "authored") {
    fail(`--kind は tool-output か authored です: ${kind}`);
  }

  const evidence: IssueEvidence = {
    kind,
    text: readFileSync(requireOption(options, "evidence"), "utf8").trimEnd(),
  };

  return composeIssueBody({
    heading: options.get("heading"),
    evidence,
    runUrl: options.get("run-url"),
    note: readFileSync(requireOption(options, "note"), "utf8").trimEnd(),
  });
}

function reviewBlock(options: Map<string, string>): string {
  const kind = requireOption(options, "kind");

  if (kind !== REVIEW_KIND.story && kind !== REVIEW_KIND.screen) {
    fail(`--kind は story か screen です: ${kind}`);
  }

  const command = composeReviewCommand({
    kind,
    ids: requireOption(options, "ids"),
    headRef: requireOption(options, "head-ref"),
    runId: options.get("run-id"),
  });

  // 貼れない値が混ざっていれば節ごと出さない。案内だけを残すと、読み手は在るはずのコマンドを
  // 探すことになる。
  if (command === null) {
    return "";
  }

  return [
    requireOption(options, "heading"),
    requireOption(options, "lead"),
    `\`\`\`bash\n${command}\n\`\`\``,
    REVIEW_WORKTREE_NOTE,
  ].join("\n\n");
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseOptions(rest);

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

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

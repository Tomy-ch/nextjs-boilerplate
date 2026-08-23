#!/usr/bin/env node

// SAST が読むルール集合を、固定した commit から取り出して置く。
//
// `make sast` はこれを先に呼び、`--config tmp/opengrep-rules` を読む。レジストリ（semgrep.dev）
// は引かない —— 理由は manifest.ts と docs/adr/0110-security-operations.md が持つ。
//
// 2 つの mode を持つ。既定は取得と照合で、`--resolve` は commit を上げた人が新しい digest を
// 得るためのもの（照合せずに算出だけする）。`actions-pin` の resolve / check と同じ形。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { ruleSetDigest } from "./digest.js";
import { RULES_COMMIT, RULES_DIGEST, RULES_DIR, RULES_REPO } from "./manifest.js";
import { selectRuleMembers } from "./selection.js";

function printUsage(): void {
  console.log(
    [
      "使い方: pnpm exec tsx scripts/opengrep-rules [--resolve]",
      "",
      `  ${RULES_REPO}@${RULES_COMMIT} から SAST のルールを ${RULES_DIR} へ取り出す。`,
      "  取り出した集合の digest を manifest.ts の宣言と照合し、違えば落とす。",
      "",
      "  --resolve  照合せず digest を算出して表示する（commit を上げたときの再固定用）",
    ].join("\n"),
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }
  const resolving = args.includes("--resolve");

  const root = process.cwd();
  const target = path.join(root, RULES_DIR);

  // 既に固定どおりのものが置いてあれば何もしない。CI は毎回取りに行くが、手元で `make sast` を
  // 繰り返すときに毎回 1 MB を落とさせない。
  if (!resolving && fs.existsSync(target) && digestOf(target) === RULES_DIGEST) {
    console.log(`✅ ${RULES_DIR} は ${RULES_REPO}@${RULES_COMMIT.slice(0, 7)} で固定済みです`);
    return;
  }

  const work = fs.mkdtempSync(path.join(root, "tmp", "opengrep-rules-"));
  try {
    const archive = path.join(work, "rules.tar.gz");
    download(archive);

    const members = selectRuleMembers(listMembers(archive));
    if (members.length === 0) {
      throw new Error(
        `${RULES_REPO}@${RULES_COMMIT} から取り出すルールが 1 件もありません（置き場の構成が変わった可能性があります）`,
      );
    }

    const staged = path.join(work, "rules");
    fs.mkdirSync(staged, { recursive: true });
    extract(archive, staged, members, work);

    const digest = digestOf(staged);
    if (resolving) {
      console.log(`ルール ${members.length} 件 / digest:`);
      console.log(digest);
      return;
    }
    // 固定した中身と違うものを置かない。**置いてから照合すると、落ちた後のツリーに
    // 照合できなかったルールが残り、次の実行が「固定済み」と読む。**
    if (digest !== RULES_DIGEST) {
      throw new Error(
        [
          `取り出したルールが固定した digest と一致しません（${RULES_REPO}@${RULES_COMMIT}）`,
          `  宣言: ${RULES_DIGEST || "(未設定)"}`,
          `  実際: ${digest}`,
          "  commit を上げたなら --resolve で算出し直して manifest.ts へ書いてください。",
        ].join("\n"),
      );
    }

    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(staged, target);
    console.log(`✅ ルール ${members.length} 件を ${RULES_DIR} へ置きました`);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

function download(archive: string): void {
  // --fail-with-body: 404 の本文をアーカイブとして保存しない。
  execFileSync(
    "curl",
    [
      "--fail-with-body",
      "-sSL",
      "--retry",
      "5",
      "--retry-all-errors",
      "-o",
      archive,
      `https://codeload.github.com/${RULES_REPO}/tar.gz/${RULES_COMMIT}`,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
}

function listMembers(archive: string): string[] {
  return execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .split("\n")
    .filter((line) => line !== "");
}

// 選んだメンバーだけを名指しで取り出す。`--files-from` は GNU tar と bsdtar の双方が持つので、
// ランナー（GNU）と macOS（bsd）で書き分けずに済む。
function extract(archive: string, into: string, members: readonly string[], work: string): void {
  const list = path.join(work, "members.txt");
  fs.writeFileSync(list, `${members.join("\n")}\n`);
  execFileSync("tar", ["-xzf", archive, "-C", into, "--strip-components=1", "-T", list], {
    stdio: ["ignore", "ignore", "inherit"],
  });
}

function digestOf(dir: string): string {
  return ruleSetDigest(
    walk(dir).map((absolute) => ({
      path: path.relative(dir, absolute).split(path.sep).join("/"),
      content: fs.readFileSync(absolute, "utf8"),
    })),
  );
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

try {
  main();
} catch (e) {
  console.error(`❌ ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

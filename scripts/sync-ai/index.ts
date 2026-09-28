#!/usr/bin/env node

// sync-ai の転送契約を、Codex 側へ非対話で渡す。
//
// 実行: pnpm exec tsx scripts/sync-ai <contract-file>
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { isCommandOnPath } from "../lib/command-presence.js";
import { errorMessage } from "../lib/error-message.js";
import { CODEX_RECEIVER_WORKFLOW, codexExecArgs, handoffPrompt } from "./handoff.js";
import { acquireHandoffLock, lockRefusal, releaseHandoffLock } from "./lock.js";

const EXIT_USAGE = 2;
const EXIT_LOCK_HELD = 3;
const EXIT_CODEX_ABSENT = 4;

/**
 * リポジトリの絶対パスを返す。
 *
 * @returns `git rev-parse --show-toplevel` の結果
 */
function repoRoot(): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

/**
 * 契約を読み、リースを取って `codex exec` を起動する。
 *
 * @returns このプロセスの終了コード
 */
function main(): number {
  const contractPath = process.argv[2];

  if (contractPath === undefined) {
    console.error("usage: pnpm exec tsx scripts/sync-ai <contract-file>");

    return EXIT_USAGE;
  }

  let contract: string;

  try {
    contract = fs.readFileSync(contractPath, "utf8");
  } catch (error) {
    console.error(`✘ sync-ai: 契約を読めません: ${contractPath}\n    ${errorMessage(error)}`);

    return EXIT_USAGE;
  }

  if (!isCommandOnPath("codex")) {
    console.error("✘ sync-ai: 'codex' CLI が PATH に見つかりません。");
    console.error("    このスクリプトは codex を導入しません。");
    console.error("    所見として報告し、導入するかは人が決めてください。");

    return EXIT_CODEX_ABSENT;
  }

  const root = repoRoot();
  const lockPath = path.join(root, "tmp", "skills", "sync-ai", ".handoff.lock");
  const lock = acquireHandoffLock(lockPath, `scripts/sync-ai (pid ${process.pid})`, Date.now());

  if (!lock.acquired) {
    console.error(lockRefusal(lockPath, lock));

    return EXIT_LOCK_HELD;
  }

  // 子と同じ端末の Ctrl-C / TERM で親だけが先に死ぬと、リースが残る。子の終了を待って手放す。
  process.on("SIGINT", () => undefined);
  process.on("SIGTERM", () => undefined);

  try {
    const hasReceiverWorkflow = fs.existsSync(path.join(root, CODEX_RECEIVER_WORKFLOW));
    const result = spawnSync("codex", codexExecArgs(root), {
      cwd: root,
      input: handoffPrompt(contract, hasReceiverWorkflow),
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (result.error !== undefined) {
      console.error(`✘ sync-ai: codex を起動できません\n    ${errorMessage(result.error)}`);

      return 1;
    }

    return result.status ?? 1;
  } finally {
    releaseHandoffLock(lockPath);
  }
}

try {
  process.exit(main());
} catch (error) {
  console.error(`✘ sync-ai: 想定外のエラー\n    ${errorMessage(error)}`);
  process.exit(1);
}

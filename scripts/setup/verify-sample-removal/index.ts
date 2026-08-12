// サンプル破棄の検証の入口。判定は verify.ts が持ち、ここは入力の収集と終了コードだけを担う。

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT_DIR } from "../lib/runtime.js";
import {
  buildDanglingCommand,
  collectFailures,
  parseSnapshot,
  selfDestructTargets,
} from "./verify.js";

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(ROOT_DIR, "tmp/sample-removal.json");

/* v8 ignore start -- CLI entry。起動経路は make setup-remove-sample と purge-verify が実地で通す。 */
function readCommand(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { cwd: ROOT_DIR, encoding: "utf8" });
  } catch (error) {
    return (error as { stdout?: string }).stdout ?? "";
  }
}

function selfDestruct(): void {
  for (const target of selfDestructTargets(SELF_DIR, SNAPSHOT_PATH)) {
    fs.rmSync(target, { force: true, recursive: true });
  }
}

function main(): void {
  console.log("🔍 サンプル破棄の検証を開始します（過不足・残留参照・道具の自消滅）。");

  const failures = collectFailures({
    registeredPaths: parseSnapshot(fs.readFileSync(SNAPSHOT_PATH, "utf8")),
    pathExists: (relativePath) => fs.existsSync(path.join(ROOT_DIR, relativePath)),
    gitStatusPorcelain: readCommand("git", ["status", "--porcelain"]),
    makeHelpOutput: readCommand("make", ["help"]),
    danglingHits: readCommand("bash", ["-c", buildDanglingCommand()]),
  });

  if (failures.length > 0) {
    console.error("❌ サンプル破棄の検証に失敗しました:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  selfDestruct();
  console.log("✅ 過不足なく破棄され、残留も無いことを確認しました。検証ツールも自消滅しました。");
}

try {
  main();
} catch (error) {
  console.error(`❌ 検証エラー: ${(error as Error).message}`);
  process.exit(1);
}
/* v8 ignore stop */

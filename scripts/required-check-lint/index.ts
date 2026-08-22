#!/usr/bin/env node

// 必須ステータスチェックに登録した context が、すべての PR で実際に報告されるかを検査する。
//
// 登録した名前が報告されない PR は「必須チェック待ち」のまま永久にマージできない。壊れ方が
// 「気づいたときには全 PR が止まっている」なので、宣言と実体のずれを push 前に落とす。
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  findViolations,
  readRequiredContexts,
  readWorkflowContexts,
  type WorkflowContexts,
} from "./required-checks.js";

const SETTINGS_FILE = ".github/settings/branch-protection.json";
const WORKFLOW_DIR = ".github/workflows";
const WORKFLOW_EXTENSIONS = [".yaml", ".yml"];

function main(): void {
  const root = process.cwd();

  const required = read(path.join(root, SETTINGS_FILE), (source) => {
    try {
      return readRequiredContexts(source);
    } catch (error) {
      abort(`${SETTINGS_FILE}: ${message(error)}`);
    }
  });

  const files = listWorkflowFiles(root);
  if (files.length === 0) {
    abort(`${WORKFLOW_DIR} にワークフローが 1 件もありません`);
  }

  const workflows: WorkflowContexts[] = files.map((file) =>
    read(path.join(root, file), (source) => {
      try {
        return readWorkflowContexts(file, source);
      } catch (error) {
        abort(message(error));
      }
    }),
  );

  const violations = findViolations(required, workflows);
  if (violations.length > 0) {
    console.error(`❌ ${SETTINGS_FILE} の必須 context が報告されない形になっています`);
    for (const violation of violations) console.error(`   ${violation}`);
    process.exit(1);
  }

  console.log(`✅ 必須 context ${required.length} 件はすべての PR で報告されます`);
}

function listWorkflowFiles(root: string): string[] {
  return readdirSync(path.join(root, WORKFLOW_DIR), { withFileTypes: true })
    .filter((entry) => entry.isFile() && WORKFLOW_EXTENSIONS.includes(path.extname(entry.name)))
    .map((entry) => `${WORKFLOW_DIR}/${entry.name}`)
    .sort();
}

function read<T>(file: string, parse: (source: string) => T): T {
  let source: string;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    abort(`${file} を読めません（リポジトリルートで実行してください）`);
  }
  return parse(source);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// 検査そのものが成立していない状態は、規約違反 (exit 1) と区別して exit 2 で落とす。
function abort(text: string): never {
  console.error(`❌ ${text}`);
  process.exit(2);
}

main();

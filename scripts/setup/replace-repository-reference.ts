#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { listFilesRecursive, toAbsolutePath, toRelativePath } from "./lib/file-utils.js";
import { exitWithUsage, parseCommonFlags, ROOT_DIR } from "./lib/runtime.js";
import { ensurePackageName, ensureRepositoryReference } from "./lib/validators.js";

type Options = {
  repository?: string;
  dryRun: boolean;
  help: boolean;
  rest: string[];
};

type PlannedChange = {
  filePath: string;
  relativePath: string;
  content: string;
  occurrences: number;
};

const PACKAGE_JSON = "package.json";

const TARGET_EXTENSIONS = new Set([
  ".md",
  ".json",
  ".jsonc",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".yaml",
  ".yml",
  ".toml",
  ".mk",
]);
const TARGET_FILE_NAMES = new Set(["Makefile"]);

// docs は boilerplate 自身の設計記録であり、フォーク先の名前へ書き換える対象ではない。
// .claude はエージェント設定と worktree の実体を含む。
const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  ".claude",
  "dist",
  "build",
  "docs",
  "tmp",
]);
const EXCLUDED_FILE_NAMES = new Set(["pnpm-lock.yaml"]);
const EXCLUDED_PATH_PREFIXES = [`scripts${path.sep}setup${path.sep}`];

function printUsage(): void {
  console.log(`使用方法:
  tsx scripts/setup/replace-repository-reference.ts --repository <owner/repo> [--dry-run]

例:
  tsx scripts/setup/replace-repository-reference.ts --repository example-org/example-app
  tsx scripts/setup/replace-repository-reference.ts --repository example-org/example-app --dry-run

補足:
  置換元は package.json の name（現在のプロジェクト名）です。
  <owner>/<現プロジェクト名> 形式のリポジトリ参照と、単独のプロジェクト名の両方を置換します。
  docs 配下・.claude 配下・scripts/setup 配下・ビルド成果物・ロックファイルは対象外です。
`);
}

function parseArgs(argv: string[]): Options {
  const options: Options = parseCommonFlags(argv);
  const args = options.rest;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--repository") {
      const value = args[i + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} の値を指定してください。`);
      }

      options.repository = value;
      i += 1;
      continue;
    }

    throw new Error(`不明な引数です: ${arg}`);
  }

  if (options.help) {
    return options;
  }

  if (!options.repository) {
    throw new Error("--repository は必須です。");
  }

  ensureRepositoryReference(options.repository);
  ensurePackageName(options.repository.split("/")[1]);

  return options;
}

function readCurrentProjectName(): string {
  const content = fs.readFileSync(toAbsolutePath(PACKAGE_JSON), "utf8");
  const { name } = JSON.parse(content) as { name?: string };

  if (!name) {
    throw new Error("package.json に name フィールドが見つかりませんでした。");
  }

  return name;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// String.replace の置換文字列では $ が後方参照などの特殊記号になるため無害化する
function escapeReplacement(value: string): string {
  return value.replace(/\$/g, "$$$$");
}

// 名前の途中で切らないための境界。`.git` や `.md` のような拡張子は境界として扱う
const NAME_TAIL_BOUNDARY = "(?![A-Za-z0-9_-])";
const NAME_HEAD_BOUNDARY = "(?<![A-Za-z0-9._-])";

// <owner>/<現プロジェクト名> 形式のリポジトリ参照。owner 部分もフォーク先へ差し替える
function buildSlugPattern(currentName: string): RegExp {
  return new RegExp(
    `${NAME_HEAD_BOUNDARY}[A-Za-z0-9._-]+/${escapeRegExp(currentName)}${NAME_TAIL_BOUNDARY}`,
    "g",
  );
}

// 単独で現れるプロジェクト名。package.json の name もここで置換される
function buildNamePattern(currentName: string): RegExp {
  return new RegExp(`${NAME_HEAD_BOUNDARY}${escapeRegExp(currentName)}${NAME_TAIL_BOUNDARY}`, "g");
}

function shouldProcessFile(filePath: string): boolean {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const fileName = path.basename(filePath);

  if (EXCLUDED_PATH_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return false;
  }

  if (EXCLUDED_FILE_NAMES.has(fileName)) {
    return false;
  }

  return TARGET_FILE_NAMES.has(fileName) || TARGET_EXTENSIONS.has(path.extname(filePath));
}

function planFile(filePath: string, currentName: string, repository: string): PlannedChange | null {
  const newName = repository.split("/")[1];
  const original = fs.readFileSync(filePath, "utf8");
  const slugPattern = buildSlugPattern(currentName);
  const namePattern = buildNamePattern(currentName);

  // スラッグ置換後の本文を数え直す。先に数えると <owner>/<name> を二重計上する
  const afterSlug = original.replace(slugPattern, escapeReplacement(repository));
  const occurrences =
    (original.match(slugPattern)?.length ?? 0) + (afterSlug.match(namePattern)?.length ?? 0);
  const content = afterSlug.replace(namePattern, escapeReplacement(newName));

  if (occurrences === 0 || content === original) {
    return null;
  }

  return { filePath, relativePath: toRelativePath(filePath), content, occurrences };
}

// 途中失敗で一部だけ書き換わった状態を残さないため、全ファイルの書き込み可否を先に確かめる
function commit(planned: PlannedChange[]): void {
  for (const change of planned) {
    fs.accessSync(change.filePath, fs.constants.W_OK);
  }

  for (const change of planned) {
    fs.writeFileSync(change.filePath, change.content);
  }
}

function run(repository: string, dryRun: boolean): void {
  const currentName = readCurrentProjectName();
  const newName = repository.split("/")[1];

  if (currentName === newName) {
    console.log(`プロジェクト名は既に ${newName} です。リポジトリ参照のみ確認します。`);
  }

  const files = listFilesRecursive(ROOT_DIR, {
    excludedDirectories: EXCLUDED_DIRECTORIES,
    shouldIncludeFile: shouldProcessFile,
  });

  const planned: PlannedChange[] = [];

  for (const filePath of files) {
    const change = planFile(filePath, currentName, repository);

    if (change) {
      planned.push(change);
    }
  }

  if (planned.length === 0) {
    console.log("置換対象は見つかりませんでした。");
    return;
  }

  planned.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  if (!dryRun) {
    commit(planned);
  }

  const total = planned.reduce((sum, change) => sum + change.occurrences, 0);
  console.log(`${dryRun ? "ドライラン" : "置換完了"}: ${planned.length}ファイル / ${total}箇所`);

  for (const change of planned) {
    console.log(`- ${change.relativePath} (${change.occurrences}箇所)`);
  }
}

function main(): void {
  let options: Options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    exitWithUsage(error as Error, printUsage);
  }

  if (options.help || !options.repository) {
    printUsage();
    return;
  }

  try {
    run(options.repository, options.dryRun);
  } catch (error) {
    console.error(`エラー: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();

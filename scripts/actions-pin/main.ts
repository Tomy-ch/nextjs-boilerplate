#!/usr/bin/env node

// GitHub Actions の `uses:` 参照を不変の commit SHA へ固定するツール。
//
//   resolve : 対象ファイルを走査し tag を SHA へ解決してロックファイルを書き出す（唯一ネットワークに出る）
//   apply   : ロックファイルを SSOT に `uses:` を `@<sha> # <tag>` へ書き換える
//   check   : apply と同じ判定を書き換えなしで行い、ずれがあれば非ゼロ終了する（CI / hook 用）
//
// 版の SSOT は `uses:` 行末尾のコメント tag であり、`@` 側の SHA ではない。固定済みの行も
// コメント tag から再解決されるため resolve は冪等。ローカル参照（`uses: ./...`）は対象外。
import { readFileSync } from "node:fs";
import path from "node:path";
import { applyPins } from "./apply-check.js";
import { LOCK_FILE, readLock, readLockOrEmpty, writeLock } from "./lockfile.js";
import { quarantine, refAgeDays, resolveSHA } from "./resolve.js";
import { collectRefs, targetFiles, unparsedUsesLines } from "./uses-reference.js";

const USAGE = "usage: actions-pin <resolve|apply|check> [--min-age-days=N]";
const MIN_AGE_PATTERN = /^--min-age-days=(\d+)$/;
const UNPARSED_MESSAGE =
  "解釈できない記法の uses: があります（1 行 1 ステップのブロック記法へ直してください）";

async function runResolve(root: string, files: string[], minAgeDays: number): Promise<void> {
  const refs = collectRefs(files);
  assertAllUsesParsed(root, files);
  const existing = readLockOrEmpty(path.join(root, LOCK_FILE));

  const resolved = await Promise.all(
    [...refs].map(async ([key, ref]) => {
      try {
        const sha = await resolveSHA(ref.repo, ref.tag);
        const ageOf = () => refAgeDays(ref.repo, ref.tag, sha);
        return { key, ...(await quarantine(ageOf, key, sha, minAgeDays, existing)) };
      } catch (e) {
        throw new Error(`${key}: ${errorMessage(e)}`);
      }
    }),
  );
  resolved.sort((a, b) => a.key.localeCompare(b.key));

  const lock = new Map<string, string>();
  for (const entry of resolved) {
    if (entry.use === null) continue;
    lock.set(entry.key, entry.use);
    console.log(`  ${entry.key} -> ${entry.use}`);
  }
  for (const entry of resolved) {
    if (entry.note) console.log(`  ⚠️ ${entry.note}`);
  }
  reportMovedPins(existing, lock);

  writeLock(path.join(root, LOCK_FILE), lock);
  console.log(`✅ ${LOCK_FILE} に ${lock.size} 件を書き出しました`);
}

// 同じ tag が別の SHA へ解決された件を明示する。moving な major tag(`# v6`)が新しい版へ
// 進むのは正常だが、厳密版の tag(`# v6.1.0`)で起きたなら版の参照はそのままに中身が
// 差し替わったということで、更新ではなくセキュリティイベントである。両者を機械的に
// 区別する手立てが無いため、判断できるよう旧新の SHA を並べて出す。
function reportMovedPins(existing: Map<string, string>, lock: Map<string, string>): void {
  const moved = [...lock].filter(([key, sha]) => existing.has(key) && existing.get(key) !== sha);
  if (moved.length === 0) return;
  console.log(
    `  ⚠️ tag の指す SHA が変わりました（${moved.length} 件）。厳密版の tag なら付け替えを疑ってください:`,
  );
  for (const [key, sha] of moved) {
    console.log(`     ${key}: ${existing.get(key)} -> ${sha}`);
  }
}

function runApplyOrCheck(root: string, files: string[], dryRun: boolean): void {
  const lockPath = path.join(root, LOCK_FILE);
  let lock: Map<string, string>;
  try {
    lock = readLock(lockPath);
  } catch (e) {
    fail(
      `ロックファイルを読めません（先に make actions-pin-resolve を実行してください）: ${errorMessage(e)}`,
    );
  }

  const report = applyPins(root, files, lock, dryRun);
  let failed = false;
  if (report.missing.length > 0) {
    printError(
      `ロックファイルに未登録の参照があります（make actions-pin-resolve を実行してください）: ${report.missing.join(", ")}`,
    );
    failed = true;
  }
  if (report.orphans.length > 0) {
    printError(
      `どの uses: からも参照されないロックファイルのエントリがあります（該当行を削除するか make actions-pin-resolve を実行してください）: ${report.orphans.join(", ")}`,
    );
    failed = true;
  }
  if (report.drifted.length > 0) {
    printError(
      `未固定 / ロックファイルと不一致の参照があります（make actions-pin-resolve && make actions-pin-apply の結果をコミットしてください）: ${report.drifted.join(", ")}`,
    );
    failed = true;
  }
  if (report.unparsed.length > 0) {
    printError(`${UNPARSED_MESSAGE}: ${report.unparsed.join(", ")}`);
    failed = true;
  }
  if (failed) process.exit(1);

  if (dryRun) {
    console.log("✅ 全アクションがロックファイル通りに固定されています");
    return;
  }
  for (const file of report.updated) console.log(`  updated ${file}`);
  console.log(`✅ ${report.updated.length} ファイルを固定しました`);
}

// resolve は対象ファイルを 1 行ずつ書き換えないため、解釈できない `uses:` を
// applyPins と同じ形で検出できない。ロックファイルに載らない参照を作らないよう、
// 走査前に同じ検査を掛ける。
function assertAllUsesParsed(root: string, files: string[]): void {
  const unparsed: string[] = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    for (const line of unparsedUsesLines(readFileSync(file, "utf8"))) {
      unparsed.push(`${relative}:${line}`);
    }
  }
  if (unparsed.length > 0) fail(`${UNPARSED_MESSAGE}: ${unparsed.join(", ")}`);
}

function parseMinAgeDays(args: string[]): number {
  let days = 0;
  for (const arg of args) {
    const match = MIN_AGE_PATTERN.exec(arg);
    if (!match) fail(USAGE);
    days = Number(match[1]);
  }
  return days;
}

function printError(message: string): void {
  console.error(`❌ ${message}`);
}

function fail(message: string): never {
  printError(message);
  process.exit(1);
}

function errorMessage(e: unknown): string {
  return (e instanceof Error && e.message ? e.message : String(e)).trim();
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const root = process.cwd();
  const files = targetFiles(root);
  switch (command) {
    case "resolve":
      await runResolve(root, files, parseMinAgeDays(rest));
      return;
    case "apply":
      runApplyOrCheck(root, files, false);
      return;
    case "check":
      runApplyOrCheck(root, files, true);
      return;
    default:
      fail(USAGE);
  }
}

main().catch((e: unknown) => {
  printError(`actions-pin: ${errorMessage(e)}`);
  process.exit(1);
});

#!/usr/bin/env node

// container image の参照を不変の digest へ固定するツール。
//
//   resolve : compose / Dockerfile を走査し tag を digest へ解決してロックファイルを書き出す
//             （唯一ネットワークに出る）
//   apply   : ロックファイルを SSOT に参照を `image:tag@sha256:...` へ書き換える
//   check   : apply と同じ判定を書き換えなしで行い、ずれがあれば非ゼロ終了する（CI / hook 用）
//
// 版の SSOT は tag 側に残し、digest をロックファイルが持つ。tag の付け替え検知は行わず、
// image に働く防壁は検疫と固定の 2 つ（根拠は [docker/README.md](../../docker/README.md)）。
import path from "node:path";
import { quarantine } from "../lib/pin-quarantine.js";
import { applyPins } from "./apply-check.js";
import { collectRefs, targetFiles } from "./image-reference.js";
import { LOCK_FILE, readLock, readLockOrEmpty, writeLock } from "./lockfile.js";
import { imageAgeDays, resolveDigest } from "./resolve.js";

const USAGE = "usage: images-pin <resolve|apply|check> [--min-age-days=N]";
const MIN_AGE_PATTERN = /^--min-age-days=(\d+)$/;

async function runResolve(root: string, minAgeDays: number): Promise<void> {
  const refs = collectRefs(targetFiles(root));
  const existing = readLockOrEmpty(path.join(root, LOCK_FILE));

  const resolved = await Promise.all(
    // キーは `image:tag` そのものなので、registry への問い合わせにそのまま渡せる。
    [...refs.keys()].map(async (key) => {
      const digest = await withKey(key, () => resolveDigest(key));
      const result = await withKey(key, () =>
        quarantine(() => imageAgeDays(key), key, digest, minAgeDays, existing),
      );

      return { key, ...result };
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

  writeLock(path.join(root, LOCK_FILE), lock);
  console.log(`✅ ${LOCK_FILE} に ${lock.size} 件を書き出しました`);

  // 退行先の無い出来立て image（検疫に掛かったうえ既存ピンも無い）は tag のまま残さず落とす。
  // 残せば apply / check が「未登録」で落ち続けるか、tag のみの参照が通ってしまう。
  const skipped = resolved.filter((entry) => entry.use === null).map((entry) => entry.key);
  if (skipped.length > 0) {
    fail(
      `${minAgeDays} 日未満・既存ピン無しのため採用できません。日を置いて再実行するか、緊急時のみ --min-age-days=0 で明示採用してください: ${skipped.sort().join(", ")}`,
    );
  }
}

function runApplyOrCheck(root: string, dryRun: boolean): void {
  const lockPath = path.join(root, LOCK_FILE);
  let lock: Map<string, string>;
  try {
    lock = readLock(lockPath);
  } catch (e) {
    fail(
      `ロックファイルを読めません（先に make images-pin-resolve を実行してください）: ${errorMessage(e)}`,
    );
  }

  const report = applyPins(root, targetFiles(root), lock, dryRun);
  let failed = false;
  if (report.missing.length > 0) {
    printError(
      `ロックファイルに未登録の image があります（make images-pin-resolve を実行してください）: ${report.missing.join(", ")}`,
    );
    failed = true;
  }
  if (report.orphans.length > 0) {
    printError(
      `どこからも参照されないロックファイルのエントリがあります（該当行を削除するか make images-pin-resolve を実行してください）: ${report.orphans.join(", ")}`,
    );
    failed = true;
  }
  if (report.drifted.length > 0) {
    printError(
      `未固定 / ロックファイルと不一致の image があります（make images-pin-resolve && make images-pin-apply の結果をコミットしてください）: ${report.drifted.join(", ")}`,
    );
    failed = true;
  }
  if (report.unparsed.length > 0) {
    printError(
      `解釈できない記法の image 参照があります（引用符を外し、1 行 1 参照・tag 明示の形へ直してください）: ${report.unparsed.join(", ")}`,
    );
    failed = true;
  }
  if (failed) process.exit(1);

  if (dryRun) {
    console.log("✅ 全 image がロックファイル通りに固定されています");

    return;
  }
  for (const file of report.updated) console.log(`  updated ${file}`);
  console.log(`✅ ${report.updated.length} ファイルを固定しました`);
}

// 失敗したキーを例外に添える。どの参照で落ちたかが分からないと、tag の綴り誤りとネットワーク
// 断を切り分けられない。
async function withKey<T>(key: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    throw new Error(`${key}: ${errorMessage(e)}`);
  }
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
  switch (command) {
    case "resolve":
      await runResolve(root, parseMinAgeDays(rest));

      return;
    case "apply":
      runApplyOrCheck(root, false);

      return;
    case "check":
      runApplyOrCheck(root, true);

      return;
    default:
      fail(USAGE);
  }
}

main().catch((e: unknown) => {
  printError(`images-pin: ${errorMessage(e)}`);
  process.exit(1);
});

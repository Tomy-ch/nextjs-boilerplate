#!/usr/bin/env node

// 本リポジトリが依存する Claude Code 公式プラグインを project スコープで宣言・有効化する。
// project スコープに置くことで marketplace とプラグイン有効化が `.claude/settings.json` に載り、
// このリポジトリを信頼した clone であれば個々の開発者のセットアップ無しに同じ資産が揃う。
// 冪等かつ非対話。再実行は no-op。
//
// 実行: pnpm exec tsx scripts/bootstrap-plugins.ts
//
// go-boilerplate の同名シェルスクリプトからの翻案。TypeScript にしているのは、
// `pnpm typecheck` と biome の検査対象に載せ、実行系を tsx へ一本化するため
// (docs/plan/go-boilerplate-import-plan.md の scripts 変換原則)。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MARKETPLACE = "claude-plugins-official";
const MARKETPLACE_SOURCE = "anthropics/claude-plugins-official";
const SCOPE = "project";
// 本リポジトリが依存する公式プラグイン。増やす場合はここに足す。
const PLUGINS = ["skill-creator"];

function errorMessage(e: unknown): string {
  return (e instanceof Error && e.message ? e.message : String(e)).trim();
}

function repoRoot(): string {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

// PATH 上に `claude` が居るかだけを見る。--version が非 0 で終わる状態
// (初回セットアップ待ち等) は「居ない」と扱わない — シェル版の `command -v` と
// 挙動を揃え、ENOENT のときだけ false を返す。
function hasClaudeCli(): boolean {
  try {
    execFileSync("claude", ["--version"], { stdio: "ignore" });
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== "ENOENT";
  }
}

// settings.json は宣言済み判定にしか使わないため、パースせず生文字列で照合する。
// CLI 側のスキーマ変更（宣言が別キーへ移る等）に引きずられないようにする意図。
function settingsDeclares(settingsPath: string, needle: string): boolean {
  try {
    return fs.readFileSync(settingsPath, "utf8").includes(`"${needle}"`);
  } catch {
    return false;
  }
}

// プラグイン本体がディスク上に解決できたかを確認する。marketplace のディレクトリ名は
// CLI が決めるため、`~/.claude/plugins/marketplaces/*/plugins/<name>` を走査して探す。
function resolvedPluginPath(plugin: string): string | undefined {
  const marketplacesDir = path.join(os.homedir(), ".claude", "plugins", "marketplaces");
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(marketplacesDir, { withFileTypes: true });
  } catch {
    return undefined;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(marketplacesDir, entry.name, "plugins", plugin);
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function run(args: string[]): void {
  execFileSync("claude", args, { stdio: "inherit" });
}

function main(): void {
  if (!hasClaudeCli()) {
    console.error("✘ bootstrap-plugins: 'claude' CLI が PATH に見つかりません");
    console.error("    対処: Claude Code CLI を導入してから再実行してください。");
    process.exit(1);
  }

  const settingsPath = path.join(repoRoot(), ".claude", "settings.json");

  // 1. 公式 marketplace を project スコープで宣言する（宣言済みなら no-op）。
  if (settingsDeclares(settingsPath, MARKETPLACE)) {
    console.log(`✔ marketplace は宣言済み (project): ${MARKETPLACE}`);
  } else {
    console.log(`→ marketplace を宣言 (project スコープ): ${MARKETPLACE_SOURCE}`);
    run(["plugin", "marketplace", "add", MARKETPLACE_SOURCE, "--scope", SCOPE]);
  }

  // 2. 各プラグインを project スコープで有効化する（有効化済みなら no-op）。
  for (const plugin of PLUGINS) {
    const ref = `${plugin}@${MARKETPLACE}`;
    if (settingsDeclares(settingsPath, ref)) {
      console.log(`✔ プラグインは有効化済み (project): ${ref}`);
    } else {
      console.log(`→ プラグインを導入 (project スコープ): ${ref}`);
      run(["plugin", "install", ref, "--scope", SCOPE]);
    }
  }

  // 3. 実体がディスク上に解決できることを確認する。
  for (const plugin of PLUGINS) {
    const hit = resolvedPluginPath(plugin);
    if (!hit) {
      console.error(`✘ bootstrap-plugins: 導入後も ${plugin} をディスク上に解決できません`);
      process.exit(1);
    }
    console.log(`✔ 解決: ${plugin} (${hit})`);
  }

  console.log("完了。新たに有効化したプラグインは次のセッションから読み込まれます。");
}

try {
  main();
} catch (e) {
  // `claude` サブコマンドが非 0 で終わった場合はその終了コードをそのまま伝播させる
  // (シェル版の set -e と同じ)。それ以外の想定外エラーだけを 2 に丸める。
  const status = (e as { status?: unknown }).status;
  if (typeof status === "number" && status !== 0) {
    console.error(`✘ bootstrap-plugins: claude コマンドが失敗しました (exit ${status})`);
    process.exit(status);
  }
  console.error(`✘ bootstrap-plugins: 想定外のエラー\n    ${errorMessage(e)}`);
  process.exit(2);
}

#!/usr/bin/env node

// 本リポジトリが推奨する外部スキルを AI アシスタントへ導入する。
// 外部スキルとは、公式 marketplace のプラグインではなく上流が配布するスキルのこと。
// 実体は user スコープ（`~/.claude/skills/`）へ入るため、project スコープで宣言できる
// プラグイン（scripts/bootstrap-plugins.ts）と違い、信頼済み clone では届かない。
// マシンごとに 1 度実行する必要がある。
// 冪等かつ非対話。
//
// 実行: pnpm exec tsx scripts/bootstrap-external-skills.ts
//
// 版は mise.toml が SSOT。`graphify` を素で呼ぶと activate 済み mise が pin どおりの実体を返すため、
// このスクリプトは版を読まないし選ばない（ADR 0003。`mise exec` での包み込みは全面禁止）。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Claude Code の設定ディレクトリ。`CLAUDE_CONFIG_DIR` が立っていればそちらが優先される。
// 着地検証はインストーラと同じ優先順位で解決しないと、導入は成功しているのに検証だけが
// `~/.claude` を見て失敗する。
function claudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
}

// 導入する外部スキル。増やす場合はここに足す。
const EXTERNAL_SKILLS = [
  {
    // `graphify install --platform <name>` の platform 名。
    //
    // Claude Code だけを対象にするのは、本リポジトリが `.codex/` などの他アシスタント用の器を
    // 持たず、着地検証ができないため。器を用意したら platform を足す。
    //
    // 使ってよいのは `install --platform <name>` だけ。紛らわしいことに `graphify <name> install`
    // という別系統の命令があり、そちらは project スコープ — このリポジトリの `CLAUDE.md` /
    // `AGENTS.md` / `.cursor/` / git hook — を書き換える。AGENTS.md が保護対象と定めている
    // ファイル群なので、`.claude/settings.json` の deny でも塞いである。
    command: "graphify",
    args: ["install", "--platform", "claude"],
    // 導入後に実体が居るべき場所。ここを見て着地を検証する。
    landing: path.join(claudeConfigDir(), "skills", "graphify", "SKILL.md"),
    label: "graphify (Claude Code)",
  },
];

function errorMessage(e: unknown): string {
  return (e instanceof Error && e.message ? e.message : String(e)).trim();
}

// PATH 上にコマンドが居るかだけを見る。--version が非 0 で終わる状態を「居ない」と扱わないのは
// bootstrap-plugins.ts と同じ（ENOENT のときだけ false）。
function isOnPath(command: string): boolean {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== "ENOENT";
  }
}

function main(): void {
  const missing = [...new Set(EXTERNAL_SKILLS.map((s) => s.command))].filter((c) => !isOnPath(c));
  if (missing.length > 0) {
    console.error(`✘ bootstrap-external-skills: PATH に見つかりません: ${missing.join(", ")}`);
    console.error(
      "    対処: make install-tools を実行し、シェルで mise activate を済ませてください。",
    );
    process.exit(1);
  }

  for (const skill of EXTERNAL_SKILLS) {
    // マーカー（`.graphify_version`）を見て skip する冪等化は採らない。install が成功すると
    // ディスク上にある全プラットフォーム分のマーカーが一括で書き換わるため、マーカーの一致は
    // スキル本体が更新された証明にならない。上書きは安価だが、古いスキルが残るのは安価ではない。
    console.log(`→ 導入: ${skill.label}`);
    execFileSync(skill.command, skill.args, { stdio: "inherit" });
  }

  let failed = false;
  for (const skill of EXTERNAL_SKILLS) {
    const landed = fs.existsSync(skill.landing) && fs.statSync(skill.landing).size > 0;
    if (landed) {
      console.log(`✔ 解決: ${skill.label} (${skill.landing})`);
    } else {
      console.error(
        `✘ bootstrap-external-skills: 導入後も ${skill.label} が ${skill.landing} に居ません`,
      );
      failed = true;
    }
  }
  if (failed) process.exit(1);

  console.log("完了。導入したスキルは次のセッションから読み込まれます。");
}

try {
  main();
} catch (e) {
  // 子プロセスが非 0 で終わった場合はその終了コードをそのまま伝播させる。
  // それ以外の想定外エラーだけを 2 に丸める（bootstrap-plugins.ts と同じ）。
  const status = (e as { status?: unknown }).status;
  if (typeof status === "number" && status !== 0) {
    console.error(`✘ bootstrap-external-skills: 外部コマンドが失敗しました (exit ${status})`);
    process.exit(status);
  }
  console.error(`✘ bootstrap-external-skills: 想定外のエラー\n    ${errorMessage(e)}`);
  process.exit(2);
}

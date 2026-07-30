// 抽出したシェルスクリプトを shellcheck へ流し、指摘を action.yaml の位置へ写し戻す。
import { spawnSync } from "node:child_process";
import type { CompositeStep } from "./composite-step.js";

const SHELLCHECK_BIN = "shellcheck";
const SHELLCHECK_TIMEOUT_MS = 30_000;
// shellcheck は指摘がある場合に 1 を返す。それ以外の非ゼロは実行そのものの失敗。
const FINDINGS_EXIT_CODE = 1;

// `shell:` の値から shellcheck に渡す方言を決める。ここに無い方言（`pwsh` / `python` 等）は
// shellcheck の対象外。
const SHEBANGS: Record<string, string> = {
  bash: "#!/usr/bin/env bash",
  sh: "#!/bin/sh",
};

// `shell: env FOO=bar bash` のように env と変数代入を前置きできるため、方言の判定では読み飛ばす。
const ENV_COMMAND = "env";
const ASSIGNMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=/;

const EXPRESSION_OPEN = "${{";
const EXPRESSION_CLOSE = "}}";
// 式を潰した跡に置く語。シェルとしては単なる語なので、式の中身に依存した誤検知が出ない。
const EXPRESSION_PLACEHOLDER = "GH_EXPR";

// `--format=gcc` の 1 行。ファイル名欄は stdin 入力を表す `-` になる。
const FINDING_PATTERN = /^[^:]*:(\d+):(\d+):(.*)$/;

// shebang を 1 行足して渡すため、shellcheck の行番号は本文より 1 大きい。
const SHEBANG_LINES = 1;

export class ShellcheckError extends Error {}

// shellcheck が PATH に無ければ検査範囲が黙って縮むため、実行前に確かめる。
export function assertShellcheckAvailable(): void {
  const probe = spawnSync(SHELLCHECK_BIN, ["--version"], { encoding: "utf8" });
  if (!probe.error) return;
  throw new ShellcheckError(
    `${SHELLCHECK_BIN} が PATH にありません。make install-tools を実行し、shell の mise activate を済ませてください`,
  );
}

// 対象外の方言なら null を返す。
export function shebangFor(shell: string): string | null {
  // 方言そのものが式で与えられている場合は静的に決められない。
  if (shell.includes(EXPRESSION_OPEN)) return null;
  for (const field of shell.split(/\s+/).filter((f) => f !== "")) {
    if (ASSIGNMENT_PATTERN.test(field)) continue;
    const name = field.slice(field.lastIndexOf("/") + 1);
    if (name === ENV_COMMAND) continue;
    return SHEBANGS[name] ?? null;
  }
  return null;
}

// `${{ }}` を行数を保つプレースホルダへ置き換える。式はシェルの構文ではないため、そのまま
// 渡すと展開結果と無関係な構文エラーになる。actionlint がワークフローの `run:` に対して
// 採るのと同じ方式。
export function maskExpressions(script: string): string {
  let rest = script;
  let masked = "";
  while (true) {
    const open = rest.indexOf(EXPRESSION_OPEN);
    if (open < 0) return masked + rest;

    masked += rest.slice(0, open);
    const body = rest.slice(open + EXPRESSION_OPEN.length);
    const end = expressionEnd(body);
    if (end < 0) throw new ShellcheckError("閉じていない ${{ があります");

    // 潰した式が跨いでいた改行はプレースホルダの後ろへ移し、以降の行番号をずらさない。
    const newlines = body.slice(0, end).split("\n").length - 1;
    masked += EXPRESSION_PLACEHOLDER + "\n".repeat(newlines);
    rest = body.slice(end + EXPRESSION_CLOSE.length);
  }
}

// 式の終端。クォートの中の `}}` で打ち切らない。
function expressionEnd(body: string): number {
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === "'") {
      quoted = !quoted;
      continue;
    }
    if (!quoted && body.startsWith(EXPRESSION_CLOSE, i)) return i;
  }
  return -1;
}

// ステップ 1 件を検査し、指摘を action.yaml の位置へ写し戻した行の配列で返す。
export function checkStep(step: CompositeStep, shebang: string): string[] {
  let script: string;
  try {
    script = maskExpressions(step.script);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new ShellcheckError(`${step.file}:${step.firstLine}: ${detail}`);
  }
  const result = spawnSync(SHELLCHECK_BIN, ["--norc", "--format=gcc", "-"], {
    input: `${shebang}\n${script}`,
    encoding: "utf8",
    timeout: SHELLCHECK_TIMEOUT_MS,
  });
  if (result.error) {
    throw new ShellcheckError(`${SHELLCHECK_BIN} の実行に失敗しました: ${result.error.message}`);
  }
  if (result.status !== 0 && result.status !== FINDINGS_EXIT_CODE) {
    const detail = (result.stderr || "").trim() || `exit ${result.status} signal ${result.signal}`;
    throw new ShellcheckError(`${SHELLCHECK_BIN} の実行に失敗しました: ${detail}`);
  }
  return remapFindings(step, result.stdout);
}

// shellcheck は shebang を含む合成スクリプト上の位置を報告するため、action.yaml の位置へ直す。
export function remapFindings(step: CompositeStep, output: string): string[] {
  const lineBase = step.firstLine - SHEBANG_LINES - 1;
  const findings: string[] = [];
  for (const line of output.trim().split("\n")) {
    const match = FINDING_PATTERN.exec(line);
    if (!match) continue;
    const row = Number(match[1]);
    const col = Number(match[2]);
    findings.push(`  ${step.file}:${lineBase + row}:${col + step.columnBase}:${match[3]}`);
  }
  return findings;
}

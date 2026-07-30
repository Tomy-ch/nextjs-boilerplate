#!/usr/bin/env node

// Mermaid のコードフェンス（```mermaid）を実際の mermaid パーサで構文検証する lint スクリプト。
// markdownlint-cli2 は Markdown の体裁しか見ず mermaid 図の文法は素通りするため、その穴を塞ぐ。
// pnpm ネイティブで `pnpm md-lint`（= tsx scripts/mermaid-lint.ts）から呼ばれる前提
// （mermaid / linkedom はルート node_modules に導入される）。
//
// mermaid.parse は DOMPurify サニタイズで DOM を要求するため、mermaid のロードには DOM 環境が要る。
// 1 つでも壊れた図があれば非 0 で終了する。
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// 本スクリプトが使う mermaid の最小面。mermaid の公開型は DOM 前提で重く、
// ここで必要なのは initialize / parse の 2 つだけなので構造的に絞る。
type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void;
  parse: (text: string) => Promise<unknown>;
};

type MermaidBlock = {
  startLine: number;
  code: string;
};

type Failure = {
  rel: string;
  startLine: number;
  index: number;
  msg: string;
};

// markdownlint-cli2 の ignores と対象範囲を揃える（node_modules・.git を除外）。
// ファイル単位の除外は現状 0 件だが、yaml 側の ignores がこの 3 粒度で書けるため、
// 対応する受け口として空のまま置く。
const EXCLUDE_DIRS = new Set(["node_modules", ".git"]);
// graphify の出力。gitignore 済みだが本スクリプトは .gitignore を見ないため、ここで外さないと
// グラフを生成した人だけ GRAPH_REPORT.md で pre-commit が落ちる。
const EXCLUDE_PREFIXES: string[] = ["graphify-out/"];
const EXCLUDE_FILES = new Set<string>([]);

function errorMessage(e: unknown): string {
  return (e instanceof Error && e.message ? e.message : String(e)).trim();
}

// 依存ロード（環境セットアップ）。mermaid / linkedom はルート node_modules に入る前提。
// ここで失敗した場合は mermaid 図の文法問題ではなく「環境未整備」なので、生の
// ERR_MODULE_NOT_FOUND スタックトレースではなく、原因と対処を明示して exit 2
// （lint 失敗の exit 1 と区別）で落とす。
async function loadMermaid(): Promise<MermaidApi> {
  try {
    // import 順の都合で mermaid より先に DOM を globalThis へ載せる必要があるため require で先行ロードする。
    const require = createRequire(import.meta.url);
    const { parseHTML } = require("linkedom");

    const { window, document } = parseHTML(
      "<!doctype html><html><head></head><body></body></html>",
    );
    // globalThis の window / document 等は DOM lib で読み取り専用のため、
    // 代入するには構造を持たない袋として扱う必要がある。
    const g = globalThis as unknown as Record<string, unknown>;
    g.window = window;
    g.document = document;
    Object.defineProperty(globalThis, "navigator", {
      value: window.navigator,
      configurable: true,
    });
    g.location = window.location;
    g.requestAnimationFrame = (fn: () => void) => setTimeout(fn, 0);
    g.MutationObserver = window.MutationObserver;

    const mermaidModule = await import("mermaid");
    const mermaid = (mermaidModule.default ?? mermaidModule) as unknown as MermaidApi;
    // logLevel:5(fatal) でパース失敗時の冗長な内部ログを抑止し、本スクリプトの整形済み出力に一本化する。
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose", logLevel: 5 });
    return mermaid;
  } catch (e) {
    const detail = errorMessage(e);
    const depMissing =
      Boolean(e) &&
      ((e as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND" ||
        /cannot find (package|module)/i.test(detail));
    console.error("✘ mermaid-lint: セットアップエラー（mermaid 図の文法問題ではありません）");
    if (depMissing) {
      console.error("    原因: mermaid / linkedom を解決できません（依存が未インストール）。");
      console.error("    対処: `pnpm install` で依存を導入してから再実行してください。");
    } else {
      console.error("    原因: 依存ロード中に想定外のエラーが発生しました。");
    }
    console.error(`    詳細: ${detail}`);
    process.exit(2);
  }
}

// root 配下の *.md を再帰収集する（除外ディレクトリは降りない）。
function collectMarkdown(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      const rel = path.relative(root, abs);
      if (EXCLUDE_FILES.has(rel)) continue;
      if (EXCLUDE_PREFIXES.some((p) => rel.startsWith(p))) continue;
      out.push(rel);
    }
  };
  walk(root);
  return out.sort();
}

// Markdown から ```mermaid フェンスを開始行付きで抜き出す。
function extractMermaidBlocks(content: string): MermaidBlock[] {
  const lines = content.split("\n");
  const blocks: MermaidBlock[] = [];
  const fence = /^(\s*)(`{3,}|~{3,})\s*mermaid\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const m = fence.exec(lines[i]);
    if (!m) continue;
    const marker = m[2][0].repeat(m[2].length);
    const close = new RegExp(`^\\s*${marker[0] === "`" ? "`" : "~"}{${m[2].length},}\\s*$`);
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      // close は `\s*$` 終端のため、フェンス文字のみの行だけが閉じになる（```mermaid 等は閉じ扱いにならない）。
      if (close.test(lines[j])) break;
      body.push(lines[j]);
    }
    blocks.push({ startLine: i + 1, code: body.join("\n") });
    i = j;
  }
  return blocks;
}

async function main(): Promise<void> {
  const mermaid = await loadMermaid();

  const repoRoot = process.cwd();
  const files = collectMarkdown(repoRoot);
  const suffix = (n: number) => (n > 0 ? `（読めず skip: ${n} 件）` : "");

  let blockCount = 0;
  let fileWithBlocks = 0;
  const failures: Failure[] = [];
  const skipped: string[] = [];

  for (const rel of files) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    } catch {
      // 読めないファイル（壊れた symlink や権限エラー）は検証対象外としてスキップする。
      // markdownlint も壊れた symlink を黙って飛ばすため挙動を揃える。
      skipped.push(rel);
      continue;
    }
    const blocks = extractMermaidBlocks(content);
    if (blocks.length > 0) fileWithBlocks++;
    for (let b = 0; b < blocks.length; b++) {
      blockCount++;
      try {
        // mermaid はグローバルな単一インスタンス + 共有 DOM を使うため、parse は並列化せず逐次実行する
        // （Promise.all で並列化すると共有状態が競合し得る）。
        // biome-ignore lint/performance/noAwaitInLoops: mermaid の共有状態のため逐次 parse が必須
        await mermaid.parse(blocks[b].code);
      } catch (e) {
        failures.push({
          rel,
          startLine: blocks[b].startLine,
          index: b + 1,
          msg: errorMessage(e),
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`✘ mermaid-lint: ${failures.length} 件の壊れた mermaid ブロック\n`);
    for (const f of failures) {
      console.error(`  ${f.rel}:${f.startLine}  (block #${f.index})`);
      for (const line of f.msg.split("\n")) console.error(`    ${line}`);
      console.error("");
    }
    console.error(
      `検証 ${blockCount} ブロック / ${fileWithBlocks} ファイル中 ${failures.length} 件 NG`,
    );
    process.exit(1);
  }

  console.log(
    `✓ mermaid-lint: ${blockCount} ブロック / ${fileWithBlocks} ファイル すべて OK${suffix(skipped.length)}`,
  );
}

main().catch((e: unknown) => {
  console.error(`✘ mermaid-lint: 想定外のエラー\n    ${errorMessage(e)}`);
  process.exit(2);
});

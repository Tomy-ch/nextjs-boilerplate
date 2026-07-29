#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// .makefiles 配下の *.mk を再帰的に収集し、パス名でソートする
function collectMakefiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMakefiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".mk")) {
      files.push(fullPath);
    }
  }

  return files;
}

function main(): void {
  const files = collectMakefiles(".makefiles").sort();

  const lines: string[] = [];
  lines.push("📦 Makeターゲット一覧");
  lines.push("-------------------------------------------");

  // カテゴリ見出し行
  const categoryPattern = /^## (.*)/;
  // .PHONY 行（説明コメント付き。1 行に複数ターゲットを書いた場合は全件を一覧に出す）
  const phonyPattern = /^\.PHONY:\s+([^#]+?)\s*##\s*(.*)$/;
  // 説明コメント（## ...）を持たない .PHONY 行
  const undocumentedPhonyPattern = /^\.PHONY:(?!.*##)/;

  const undocumented: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");

    for (const line of content.split("\n")) {
      const categoryMatch = line.match(categoryPattern);
      if (categoryMatch) {
        lines.push("");
        lines.push(`📂 ${categoryMatch[1]}`);
        continue;
      }

      const phonyMatch = line.match(phonyPattern);
      if (phonyMatch) {
        const targets = phonyMatch[1].split(/\s+/);
        const comment = phonyMatch[2];

        for (const target of targets) {
          lines.push(`🛠  ${target.padEnd(24)} ${comment}`);
        }

        continue;
      }

      if (undocumentedPhonyPattern.test(line)) {
        // 一覧に出ない = 利用者から見えないターゲットになるため警告する
        undocumented.push(`${file}: ${line.trim()}`);
      }
    }
  }

  console.log(lines.join("\n"));

  if (undocumented.length > 0) {
    console.error("");
    console.error("⚠️  説明コメント（## ...）が無い .PHONY 行を一覧から除外しました:");

    for (const entry of undocumented) {
      console.error(`   - ${entry}`);
    }
  }
}

main();

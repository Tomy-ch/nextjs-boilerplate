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

  // カテゴリ見出し行（bash 版の ^##\ (.*) と等価）
  const categoryPattern = /^## (.*)/;
  // .PHONY 行（単一ターゲット + コメント付き。bash 版の正規表現と等価）
  const phonyPattern = /^\.PHONY: ([^\s]+)\s*##\s*(.*)$/;

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
        const target = phonyMatch[1];
        const comment = phonyMatch[2];
        // printf "🛠  %-24s %s\n" 相当（ターゲットを左寄せ幅24 + コメント）
        lines.push(`🛠  ${target.padEnd(24)} ${comment}`);
      }
    }
  }

  console.log(lines.join("\n"));
}

main();

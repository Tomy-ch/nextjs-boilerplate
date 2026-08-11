#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { buildTargetListing, type MakefileSource } from "./targets.js";

const MAKEFILES_DIR = ".makefiles";

/** `.makefiles` 配下の `*.mk` を再帰的に集め、パス名で並べる。 */
function collectMakefiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMakefiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".mk")) {
      files.push(path);
    }
  }

  return files;
}

function main(): void {
  const sources: MakefileSource[] = collectMakefiles(MAKEFILES_DIR)
    .sort()
    .map((file) => ({ file, content: readFileSync(file, "utf8") }));
  const { lines, undocumented } = buildTargetListing(sources);

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

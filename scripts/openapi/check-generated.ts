#!/usr/bin/env node
// 取得済みの契約と生成物の版が揃っているかを検査する（drift ゲートの観点 2）。
import { existsSync, readFileSync } from "node:fs";

import { findStampDrift, type GeneratedArtifact, stampedArtifactPaths } from "./generated-stamp";
import { MANIFEST_PATH, parseSourcesManifest } from "./sources-manifest";

const sources = parseSourcesManifest(readFileSync(MANIFEST_PATH, "utf8"));
const artifacts: GeneratedArtifact[] = [];

for (const source of sources) {
  for (const path of stampedArtifactPaths(source.name)) {
    if (existsSync(path)) {
      artifacts.push({ path, content: readFileSync(path, "utf8") });
    }
  }
}

const drift = findStampDrift(sources, artifacts);

if (drift.length > 0) {
  console.error("❌ 契約と生成物の版が揃っていません:");

  for (const message of drift) {
    console.error(`  - ${message}`);
  }

  console.error("  make gen-api を実行してください。");
  process.exit(1);
}

console.log(`✅ ${sources.length} 件の契約と生成物の版が一致しています`);

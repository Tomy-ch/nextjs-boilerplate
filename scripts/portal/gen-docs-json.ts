import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

import {
  buildDocsJson,
  type DiscoveredDirectory,
  type DiscoveredDocs,
  splitByLanguage,
} from "./docs-json";

const DOCS_DIR = "docs";
const MANIFEST_PATH = "docs/portal/manifest.yaml";
const OUTPUT_PATH = "docs/portal/docs.json";

/** ビューアー自身は生成物なので section にしない。 */
const NON_SECTION_DIRECTORIES = new Set(["portal"]);

function markdownIn(directory: string) {
  return splitByLanguage(readdirSync(directory).sort());
}

function discover(): DiscoveredDocs {
  const directories: DiscoveredDirectory[] = readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NON_SECTION_DIRECTORIES.has(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      hasIndexHtml: existsSync(join(DOCS_DIR, name, "index.html")),
      ...markdownIn(join(DOCS_DIR, name)),
    }));
  const root = markdownIn(DOCS_DIR);

  return { directories, rootEnFiles: root.enFiles, rootJaFiles: root.jaFiles };
}

if (!existsSync(MANIFEST_PATH)) {
  console.error(`❌ manifest がありません: ${MANIFEST_PATH}`);
  process.exit(1);
}

const { docs, warnings } = buildDocsJson(parse(readFileSync(MANIFEST_PATH, "utf8")), discover());

for (const warning of warnings) {
  console.warn(`⚠ ${warning}`);
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(docs, null, 2)}\n`);

console.log(`✅ ${OUTPUT_PATH} を生成しました（group ${docs.groups.length} 件）`);

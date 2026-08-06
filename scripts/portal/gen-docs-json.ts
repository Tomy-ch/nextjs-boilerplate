import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

import { buildDocsJson, type DiscoveredDirectory, type DiscoveredDocs } from "./docs-json";

const DOCS_DIR = "docs";
const MANIFEST_PATH = "docs/portal/manifest.yaml";
const OUTPUT_PATH = "docs/portal/docs.json";

/** ビューアー自身と翻訳ツリーは section にしない。前者は生成物、後者は各 section の一部。 */
const NON_SECTION_DIRECTORIES = new Set(["portal", "ja"]);

function markdownIn(directory: string): string[] {
  return existsSync(directory)
    ? readdirSync(directory)
        .filter((file) => file.endsWith(".md"))
        .sort()
    : [];
}

function discover(): DiscoveredDocs {
  const directories: DiscoveredDirectory[] = readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !NON_SECTION_DIRECTORIES.has(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      name,
      hasIndexHtml: existsSync(join(DOCS_DIR, name, "index.html")),
      enFiles: markdownIn(join(DOCS_DIR, name)),
      jaFiles: markdownIn(join(DOCS_DIR, "ja", name)),
    }));

  return {
    directories,
    rootEnFiles: markdownIn(DOCS_DIR),
    rootJaFiles: markdownIn(join(DOCS_DIR, "ja")),
  };
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

#!/usr/bin/env node

// デザインシステムを、外部のデザイン支援ツールが読める 1 つの bundle として書き出す。
//
// 送り先は決めない。特定 SaaS の手順はここに書かず、`.claude/skills/` のスキルへ閉じ込める
// (ADR 0010 非ロックイン)。ここが出すのは、どの送り先でも入力になりうる 3 つだけである。
//
//   r/*.json    shadcn registry。ソースとメタ。取り込みで使っている形式をそのまま逆向きに出す
//   catalog.md  component 目録。用途・責務境界・story 一覧と、その説明
//   tokens.css  生成済みの semantic token
//
// 依存の向きは repo → design の一本で、書き出した先の成果物を repo へ取り込む経路は作らない。
import { execFile } from "node:child_process";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { parse } from "yaml";
import { z } from "zod";

const repositoryRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(repositoryRoot, "src/components/shadcn-manifest.yaml");
const tokensCssPath = resolve(repositoryRoot, "src/app/generated/tokens.css");
const storybookIndexPath = resolve(repositoryRoot, "storybook-static/index.json");
const outputDirectory = resolve(repositoryRoot, "tmp/design-bundle");

/** registry の item 種別。実体を書き換える層かどうかで分ける。 */
const REGISTRY_ITEM_TYPE = {
  /** 契約を知らない基礎部品。fork 先も土台として残す */
  UI: "registry:ui",
  /** 契約や画面骨格を前提にする部品。fork 先が作り替える */
  COMPONENT: "registry:component",
} as const;

/** 実装ではないファイル。registry には載せない。 */
const EXCLUDED_SUFFIXES = [".test.ts", ".test.tsx", "README.md"] as const;

const presentEntrySchema = z.object({
  kind: z.enum(["copy-in", "reimplemented", "original"]),
  layer: z.enum(["design-system", "patterns", "app-starter", "shell"]),
  as: z.string(),
  directory: z.string(),
});

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  components: z.record(
    z.string(),
    z.union([presentEntrySchema, z.object({ kind: z.literal("not-adopted") })]),
  ),
});

const storybookIndexSchema = z.object({
  entries: z.record(
    z.string(),
    z.object({
      id: z.string(),
      name: z.string(),
      title: z.string(),
      type: z.string(),
      importPath: z.string(),
    }),
  ),
});

/** bundle に載せる component 1 件。 */
export type BundleComponent = {
  name: string;
  title: string;
  layer: string;
  as: string;
  directory: string;
  /** README の「用途」節。1 行で何のための部品かを表す */
  purpose: string;
  /** README の「責務境界」節。この部品が持たないもの */
  boundary: string;
  files: string[];
  stories: { id: string; name: string }[];
};

/** `## 見出し` の直後から次の見出しの手前までを、1 行へ畳んで返す。 */
export function sectionOf(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));

  return (end === -1 ? rest : rest.slice(0, end))
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
}

/** README の先頭見出しを component の表示名として使う。 */
export function titleOf(markdown: string, fallback: string): string {
  return /^# (.+)$/m.exec(markdown)?.[1].trim() ?? fallback;
}

/** 層から registry の item 種別を決める。 */
export function itemTypeOf(layer: string): string {
  return layer === "design-system" ? REGISTRY_ITEM_TYPE.UI : REGISTRY_ITEM_TYPE.COMPONENT;
}

/** component ディレクトリ直下の実装ファイルを、registry へ載せる順で返す。 */
export function bundledFilesOf(entries: readonly string[]): string[] {
  return entries
    .filter((entry) => !EXCLUDED_SUFFIXES.some((suffix) => entry.endsWith(suffix)))
    .sort();
}

/** 目録を Markdown で組み立てる。送り先が人でも AI でも、まずこれを読めば全体が分かる。 */
export function renderCatalog(components: readonly BundleComponent[]): string {
  const byLayer = new Map<string, BundleComponent[]>();
  for (const component of components) {
    byLayer.set(component.layer, [...(byLayer.get(component.layer) ?? []), component]);
  }

  const lines = [
    "# デザインシステム目録",
    "",
    "このリポジトリが持つ component の全件です。`r/` の registry がソースを、`tokens.css` が",
    "色・余白などの semantic token を持ちます。**参照は一方向で、ここから作った成果物を",
    "リポジトリへ自動で戻す経路はありません。**",
    "",
  ];

  for (const [layer, items] of [...byLayer].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${layer}`, "");
    for (const component of items.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`### ${component.title}`, "");
      lines.push(`- 見出し: ${component.as}`, `- 置き場: ${component.directory}`);
      if (component.purpose !== "") lines.push(`- 用途: ${component.purpose}`);
      if (component.boundary !== "") lines.push(`- 持たないもの: ${component.boundary}`);
      if (component.stories.length > 0) {
        lines.push(`- story: ${component.stories.map((story) => story.name).join(" / ")}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

/* v8 ignore start -- ファイル入出力と shadcn CLI の呼び出しは pnpm design:bundle が実地で通す。 */
async function collectComponents(): Promise<BundleComponent[]> {
  const manifest = manifestSchema.parse(parse(await readFile(manifestPath, "utf8")));

  let index: z.infer<typeof storybookIndexSchema> | undefined;
  try {
    index = storybookIndexSchema.parse(JSON.parse(await readFile(storybookIndexPath, "utf8")));
  } catch {
    throw new Error(
      "storybook-static/index.json がありません。先に pnpm build-storybook を実行してください。",
    );
  }

  const storiesByImportPath = new Map<string, { id: string; name: string }[]>();
  for (const entry of Object.values(index.entries)) {
    if (entry.type !== "story") continue;
    const key = entry.importPath.replace(/^\.\//, "");
    storiesByImportPath.set(key, [
      ...(storiesByImportPath.get(key) ?? []),
      { id: entry.id, name: entry.name },
    ]);
  }

  const components: BundleComponent[] = [];

  for (const [name, entry] of Object.entries(manifest.components)) {
    if (entry.kind === "not-adopted") continue;

    const directory = resolve(repositoryRoot, entry.directory);
    // biome-ignore lint/performance/noAwaitInLoops: component ごとに README とディレクトリを読むだけで、並列化するほどの件数ではない
    const readme = await readFile(join(directory, "README.md"), "utf8");
    const directoryEntries = await readdir(directory, { withFileTypes: true });
    // 入れ子の component は親のディレクトリに同居する。子ディレクトリは自分の item が持つ
    const names = directoryEntries.filter((file) => file.isFile()).map((file) => file.name);
    const files = bundledFilesOf(names).map((file) =>
      relative(repositoryRoot, join(directory, file)),
    );

    components.push({
      name,
      title: titleOf(readme, name),
      layer: entry.layer,
      as: entry.as,
      directory: entry.directory,
      purpose: sectionOf(readme, "用途"),
      boundary: sectionOf(readme, "責務境界"),
      files: files.filter((file) => !file.endsWith(".stories.tsx")),
      stories: files.flatMap((file) => storiesByImportPath.get(file) ?? []),
    });
  }

  return components;
}

async function main(): Promise<void> {
  const components = await collectComponents();

  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  const registryPath = join(outputDirectory, "registry.json");
  await writeFile(
    registryPath,
    `${JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        name: "nextjs-boilerplate",
        homepage: "https://github.com/",
        items: components.map((component) => ({
          name: component.name,
          type: itemTypeOf(component.layer),
          title: component.title,
          description: component.purpose,
          files: component.files.map((file) => ({ path: file, type: itemTypeOf(component.layer) })),
        })),
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(join(outputDirectory, "catalog.md"), renderCatalog(components));
  await copyFile(tokensCssPath, join(outputDirectory, "tokens.css"));

  await promisify(execFile)(
    "pnpm",
    ["exec", "shadcn", "build", registryPath, "-o", join(outputDirectory, "r")],
    { cwd: repositoryRoot },
  );

  process.stdout.write(
    `書き出しました: ${relative(repositoryRoot, outputDirectory)}（component ${components.length} 件）\n`,
  );
}

if (process.argv[1]?.endsWith("design-bundle.ts")) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
/* v8 ignore stop */

#!/usr/bin/env node
// openapi/sources.yaml の座標に従い、gh 経由でバックエンド契約を取得する。
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { decodeContentsResponse } from "./contents-response";
import { buildContractArtifact } from "./contract-stamp";
import {
  applyStamps,
  type ContractStamp,
  contractPath,
  encodeContractPath,
  MANIFEST_PATH,
  type OpenApiSource,
  parseSourcesManifest,
  selectSources,
} from "./sources-manifest";

const execFileAsync = promisify(execFile);

const NETWORK_TIMEOUT_MS = 30_000;
// 契約 1 本が数百 KB になるため、既定の stdout 上限では足りない。
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

async function fetchContents(source: OpenApiSource): Promise<unknown> {
  // path と ref はリポジトリ内のテキスト由来なので、シェルを介さず引数として渡し、
  // URL の構造を決める文字は符号化してから埋める。
  const endpoint = `repos/${source.repo}/contents/${encodeContractPath(source.path)}?ref=${encodeURIComponent(source.ref)}`;

  const { stdout } = await execFileAsync("gh", ["api", endpoint], {
    timeout: NETWORK_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
  });

  return JSON.parse(stdout);
}

async function main(): Promise<void> {
  const declaration = readFileSync(MANIFEST_PATH, "utf8");
  const targets = selectSources(parseSourcesManifest(declaration), process.argv.slice(2));

  // 取得は並行に行い、書き出しは宣言順に行う。契約どうしに依存は無いが、出力とスタンプの順が
  // 取得の速さで入れ替わると、同じ宣言から実行のたびに違う差分が出る。
  const fetched = await Promise.all(
    targets.map(async (source) => ({
      source,
      ...decodeContentsResponse(await fetchContents(source)),
    })),
  );

  const fetchedAt = new Date().toISOString();
  const stamps = new Map<string, ContractStamp>(
    fetched.map(({ source, sha }) => [source.name, { sha, fetchedAt }]),
  );
  // 書き出す本文を全て組み立ててから書き込む。1 本目を書いた後にスタンプの生成で落ちると、
  // 取得物だけ新しく宣言は古いという、どちらが正か分からない状態が作業ツリーに残る。
  const artifacts = fetched.map(({ source, sha, spec }) => ({
    source,
    sha,
    destination: contractPath(source.name),
    body: buildContractArtifact(spec, sha),
  }));
  const stamped = applyStamps(declaration, stamps);

  for (const { source, sha, destination, body } of artifacts) {
    writeFileSync(destination, body, "utf8");
    console.log(`✅ ${destination} ← ${source.repo}:${source.path} (${sha})`);
  }

  writeFileSync(MANIFEST_PATH, stamped, "utf8");
  console.log(`✅ ${MANIFEST_PATH} へ blob SHA をスタンプしました`);
}

main().catch((error: unknown) => {
  console.error(
    `❌ 契約の取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

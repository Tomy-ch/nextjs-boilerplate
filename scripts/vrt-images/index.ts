#!/usr/bin/env node

// 基準画像の置き場に対する操作の入口。
//
//   ref <branch>   撮影を指す ref 名を出す（撮り直しの workflow が使う）
//   report         掃除の要否を判定して本文を出す。促すときだけ終了コード 10 を返す
//   prune          消してよい ref を実際に消す
//
// 置き場側に workflow を持たせないため、GitHub への問い合わせはすべてここから出る。
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  formatPrunePlan,
  needsPrune,
  planPrune,
  type SnapshotRef,
  selectLiveBranches,
  selectRetainedTags,
  snapshotRefName,
} from "./plan.js";
import { RETAINED_TAG_COUNT } from "./retention.js";

/** 主リポジトリ側のサブモジュールの位置。ここの gitlink が保持すべきコミットを指す。 */
const SUBMODULE_PATH = "vrt/__screenshots__";

/** 促すときの終了コード。1 は問い合わせ自体の失敗に取ってある。 */
const NEEDS_PRUNE_EXIT_CODE = 10;

function main(argv: readonly string[]): void {
  const [command, ...rest] = argv;

  switch (command) {
    case "ref":
      printSnapshotRef(rest[0]);
      break;
    case "report":
      report();
      break;
    case "prune":
      prune(rest.includes("--dry-run"));
      break;
    default:
      fail("使い方: vrt-images <ref <branch> | report | prune [--dry-run]>");
  }
}

function printSnapshotRef(branch: string | undefined): void {
  if (!branch) fail("ブランチ名を渡してください。");
  console.log(snapshotRefName(branch));
}

function report(): void {
  const { plan, sizeMiB } = buildPlan();
  console.log(formatPrunePlan(plan, sizeMiB));

  if (needsPrune(plan, sizeMiB)) {
    process.exit(NEEDS_PRUNE_EXIT_CODE);
  }
}

function prune(dryRun: boolean): void {
  const { plan, sizeMiB, images } = buildPlan();
  console.log(formatPrunePlan(plan, sizeMiB));

  if (plan.remove.length === 0) {
    console.log("\n✅ 消す対象がありません。");
    return;
  }
  if (dryRun) {
    console.log("\n🟡 DRY_RUN のため何も消していません。");
    return;
  }

  for (const ref of plan.remove) {
    gh(["api", "-X", "DELETE", `repos/${images}/git/refs/heads/${ref.name}`, "--silent"]);
    console.log(`🔸 削除: ${ref.name}`);
  }
  console.log(`\n✅ ${plan.remove.length} 本の ref を消しました。`);
  console.log("   実体の回収は GitHub 側の gc に委ねられます。容量がすぐに落ちなくても正常です。");
}

function buildPlan(): { plan: ReturnType<typeof planPrune>; sizeMiB: number; images: string } {
  const parent = ghText(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
  const images = resolveImagesRepository();

  const branches = selectLiveBranches(
    ghJson<{ name: string }[]>(["api", `repos/${parent}/branches`, "--paginate"]).map(
      (branch) => branch.name,
    ),
  );
  const tags = selectRetainedTags(
    ghJson<{ name: string }[]>(["api", `repos/${parent}/tags?per_page=${RETAINED_TAG_COUNT}`]).map(
      (tag) => tag.name,
    ),
  );
  const pullRequestHeads = ghJson<{ headRefOid: string }[]>([
    "pr",
    "list",
    "--state",
    "open",
    "--limit",
    "200",
    "--json",
    "headRefOid",
  ]).map((pull) => pull.headRefOid);

  const retained = new Set<string>();
  for (const ref of [...branches, ...tags, ...pullRequestHeads]) {
    const sha = gitlinkAt(parent, ref);
    if (sha) retained.add(sha);
  }

  const refs: SnapshotRef[] = ghJson<{ ref: string; object: { sha: string } }[]>([
    "api",
    `repos/${images}/git/matching-refs/heads`,
    "--paginate",
  ]).map((entry) => ({ name: entry.ref.replace(/^refs\/heads\//, ""), sha: entry.object.sha }));

  // GitHub の size は KB。閾値は MiB で宣言してあるので揃える。
  const sizeMiB = Math.round(Number(ghText(["api", `repos/${images}`, "-q", ".size"])) / 1024);

  return { plan: planPrune(refs, retained), sizeMiB, images };
}

/** `.gitmodules` の URL から置き場の owner/repo を読む。正は配線であって設定値ではない。 */
function resolveImagesRepository(): string {
  const url = readFileSync(".gitmodules", "utf8")
    .split("\n")
    .map((line) => /^\s*url\s*=\s*(.+?)\s*$/.exec(line)?.[1])
    .find((candidate) => candidate !== undefined);

  const owned = url === undefined ? null : /github\.com[:/]+([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  if (owned === null) fail(".gitmodules から基準画像のリポジトリを読めません。");
  return owned[1];
}

/**
 * ある ref における gitlink の sha。
 *
 * サブモジュールを持たない時点の ref（配線より前のタグなど）では 404 になる。保持すべき
 * ものが無いだけなので、そこは黙って飛ばす。
 */
function gitlinkAt(parent: string, ref: string): string | undefined {
  try {
    return ghText([
      "api",
      `repos/${parent}/contents/${SUBMODULE_PATH}?ref=${encodeURIComponent(ref)}`,
      "-q",
      ".sha",
    ]);
  } catch {
    return undefined;
  }
}

function ghJson<T>(args: readonly string[]): T {
  return JSON.parse(gh(args)) as T;
}

// `-q` を付けたときの gh はスカラーを裸で出す（文字列も引用符なし）ため、JSON としては読めない。
function ghText(args: readonly string[]): string {
  return gh(args).trim();
}

function gh(args: readonly string[]): string {
  return execFileSync("gh", [...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}

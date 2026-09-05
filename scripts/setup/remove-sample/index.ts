// サンプルを破棄する入口。判定は plan.ts、対象の宣言は sample-manifest.ts が持ち、ここは
// ファイル入出力・スナップショットの書き出し・終了コードだけを担う。

import fs from "node:fs";
import path from "node:path";

import {
  listFilesRecursive,
  readUtf8File,
  removeTarget,
  toAbsolutePath,
  toRelativePath,
} from "../lib/file-utils.js";
import { stripMarkers } from "../lib/markers.js";
import { exitWithUsage, parseCommonFlags, ROOT_DIR } from "../lib/runtime.js";
import {
  buildSteps,
  canHoldMarker,
  findMisplacedRestorations,
  findOccupiedRestorations,
  findRedundantPaths,
  isScanTarget,
} from "./plan.js";
import {
  BINARY_EXTENSIONS,
  DANGLING_PATTERN,
  EXCLUDED_DIRECTORIES,
  EXCLUDED_PATH_PREFIXES,
  MARKER_LITERAL_FILES,
  SAMPLE_MARKER,
  SAMPLE_PATHS,
  SAMPLE_RESTORATIONS,
} from "./sample-manifest.js";

/** 検証ツールが読む、削除した対象の記録。 */
const SNAPSHOT_PATH = "tmp/sample-removal.json";

function printUsage(): void {
  console.log(
    [
      "使い方: pnpm exec tsx scripts/setup/remove-sample [--dry-run]",
      "",
      "  サンプル（EC の題材を持つ画面群と、その題材に固有の契約・モック）を破棄する。",
      "  --dry-run  実際には書き換えず、対象だけを表示する",
      "",
      "  破棄後は pnpm exec tsx scripts/setup/verify-sample-removal で過不足を検証する。",
    ].join("\n"),
  );
}

/**
 * 1 ファイルからマーカーで囲まれた行を落とす。
 *
 * @returns 報告に出す 1 行。マーカーを持てないファイルと、落ちる行が無かったファイルは `null`。
 */
function stripStep(relativePath: string, dryRun: boolean): string | null {
  const content = readUtf8File(toAbsolutePath(relativePath));

  // UTF-8 として往復できないファイル（画像など）はマーカーを持てない。
  if (content === null) {
    return null;
  }

  const result = stripMarkers(content, SAMPLE_MARKER);

  if (result.removed === 0) {
    return null;
  }

  if (!dryRun) {
    fs.writeFileSync(toAbsolutePath(relativePath), result.content);
  }

  return `${relativePath} (${result.removed} 行)`;
}

/**
 * 雛形の中身を、破棄後に残す場所へ書き出す。
 *
 * @returns 報告に出す 1 行。
 */
function restoreStep(from: string, to: string, dryRun: boolean): string {
  const content = readUtf8File(toAbsolutePath(from));

  if (content === null) {
    throw new Error(`置き直す雛形を読めません: ${from}`);
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(toAbsolutePath(to)), { recursive: true });
    fs.writeFileSync(toAbsolutePath(to), content);
  }

  return `${to} (${from})`;
}

/**
 * 宣言どうしの整合を、1 つも書き換える前に確かめる。
 *
 * @remarks
 * 削除は取り消せないので、宣言の書き間違いはここで落とします。実行を始めてから気づく形にすると、
 * 半分だけ消えた木が残ります。
 */
function assertDeclarations(): void {
  const redundant = findRedundantPaths(SAMPLE_PATHS);

  if (redundant.length > 0) {
    throw new Error(`宣言に重複があります:\n${redundant.join("\n")}`);
  }

  const misplaced = [
    ...findMisplacedRestorations(SAMPLE_RESTORATIONS, SAMPLE_PATHS),
    ...findOccupiedRestorations(SAMPLE_RESTORATIONS, (relativePath) =>
      fs.existsSync(toAbsolutePath(relativePath)),
    ),
  ];

  if (misplaced.length > 0) {
    throw new Error(`置き直しの宣言が成立しません:\n${misplaced.join("\n")}`);
  }
}

/** 検証ツールが読む記録を書き出す。 */
function writeSnapshot(): void {
  fs.mkdirSync(toAbsolutePath("tmp"), { recursive: true });
  fs.writeFileSync(
    toAbsolutePath(SNAPSHOT_PATH),
    `${JSON.stringify(
      {
        registeredPaths: SAMPLE_PATHS,
        restoredPaths: SAMPLE_RESTORATIONS.map(({ to }) => to),
        danglingPattern: DANGLING_PATTERN,
      },
      null,
      2,
    )}\n`,
  );
}

/**
 * マーカー行のベースラインを読み書きする面。
 *
 * @remarks
 * 構造を写しているのは、指し先の綴りを型検査から隠しているためです（{@link rewriteMarkerBaseline}）。
 * 実体とずれれば、引き直しを実際に走らせる `purge-verify` がその場で落ちます。
 */
type MarkerBaselineScan = {
  BASELINE_PATH: string;
  REPO_ROOT: string;
  scanTree: (root: string) => Readonly<Record<string, number>>;
};

/** 引き直しの相手（リポジトリルート相対）。 */
const MARKER_BASELINE_DIR = "scripts/marker-baseline";

/**
 * 読み込む面（このファイルからの相対）。
 *
 * @remarks
 * 綴りを組み立てるのは、`import()` の引数を文字列リテラルにしないためです。理由は
 * {@link rewriteMarkerBaseline} が持ちます。
 */
const BASELINE_SCAN_MODULE = ["..", "..", "marker-baseline", "scan.js"].join("/");

/**
 * マーカー行のベースラインを、破棄後のツリーで引き直す。
 *
 * @remarks
 * ベースラインはマーカー行が増えていないかを見張る固定値なので、正当に減るこの破棄の後は、
 * 引き直さない限り `scripts/marker-baseline/scan.test.ts` が鳴り続けます。
 *
 * 相手は boilerplate 限定節の剥がしが**丸ごと消す**ので、この入口より先に消えていることが
 * あります。だから読み込みは存在の確認で囲みます。指し先を文字列リテラルで書かないのも同じ理由で、
 * リテラルだと型検査が解決を試み、剥がしだけを走らせたツリーで「モジュールが無い」と落ちます。
 */
async function rewriteMarkerBaseline(): Promise<void> {
  if (!fs.existsSync(toAbsolutePath(MARKER_BASELINE_DIR))) {
    return;
  }

  const scan = (await import(BASELINE_SCAN_MODULE)) as MarkerBaselineScan;
  const baseline = scan.scanTree(scan.REPO_ROOT);

  fs.writeFileSync(scan.BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log("マーカー行のベースラインを破棄後のツリーで引き直しました。");
}

/** 手順の種類ごとに、対象を 1 行ずつ出す。 */
function printEach(label: string, entries: readonly string[]): void {
  for (const entry of entries) {
    console.log(`- ${label} ${entry}`);
  }
}

/** 何をしたかを人へ出す。 */
function report(
  dryRun: boolean,
  stripped: readonly string[],
  restored: readonly string[],
  deleted: readonly string[],
): void {
  console.log(
    `${dryRun ? "ドライラン" : "破棄完了"}: マーカー ${stripped.length}` +
      ` / 置き直し ${restored.length} / 削除 ${deleted.length}`,
  );

  printEach("マーカー除去", stripped);
  printEach("置き直し", restored);
  printEach("削除", deleted);
}

async function run(dryRun: boolean): Promise<void> {
  assertDeclarations();

  const scanned = listFilesRecursive(ROOT_DIR, { excludedDirectories: EXCLUDED_DIRECTORIES })
    .map((filePath) => toRelativePath(filePath).split(path.sep).join("/"))
    .filter(
      (relativePath) =>
        canHoldMarker(relativePath, BINARY_EXTENSIONS) &&
        isScanTarget(relativePath, EXCLUDED_PATH_PREFIXES, MARKER_LITERAL_FILES),
    );

  const stripped: string[] = [];
  const restored: string[] = [];
  const deleted: string[] = [];

  for (const step of buildSteps(scanned, SAMPLE_PATHS, SAMPLE_RESTORATIONS, ROOT_DIR)) {
    if (step.kind === "restore") {
      restored.push(restoreStep(step.from, step.to, dryRun));
      continue;
    }

    if (step.kind === "strip") {
      const summary = stripStep(step.relativePath, dryRun);

      if (summary !== null) {
        stripped.push(summary);
      }

      continue;
    }

    const removed = removeTarget(step.relativePath, dryRun);

    if (removed !== null) {
      deleted.push(removed);
    }
  }

  if (!dryRun) {
    writeSnapshot();
    await rewriteMarkerBaseline();
  }

  report(dryRun, stripped, restored, deleted);
}

/* istanbul ignore next -- CLI entry。起動経路は make setup-remove-sample と purge-verify が実地で通す。 */
async function main(): Promise<void> {
  const options = parseCommonFlags(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  try {
    await run(options.dryRun);
  } catch (error) {
    exitWithUsage(error as Error, printUsage);
  }
}

// トップレベル await にしない。tsx は CJS へ落とすので変換の時点で落ちる。
main().catch((error: unknown) => {
  exitWithUsage(error instanceof Error ? error : new Error(String(error)), printUsage);
});

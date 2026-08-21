import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { chromium } from "@playwright/test";
import { TEST_SESSION_ISSUED_STATUS, TEST_SESSION_PATH } from "../../e2e/lib/dev-session";
import {
  listScreenRoutes,
  resolveScreens,
  SCREEN_MANIFEST_FILE,
  SCREENS,
} from "../../e2e/lib/screens";
import {
  hasFailure,
  judge,
  type Measurement,
  type MetricValues,
  missingScreens,
  parseBudget,
} from "./budget";
import { buildChromeFlags, buildLighthouseArgs } from "./command";
import { aggregate, readMetrics } from "./metrics";
import { planTargets, type Target } from "./plan";
import { renderReport } from "./report";
import { buildCookieHeader } from "./session";

/**
 * 画面ごとの Core Web Vitals を測り、予算と照らす。
 *
 * 使い方: `tsx scripts/lighthouse`（`make lighthouse` から呼ばれる）
 *
 * アプリもブラウザもホストで動く。撮影（`vrt` / `e2e`）と違ってコンテナを使わない理由は
 * `.makefiles/testing/lighthouse.mk` にある。
 */

const BUDGET_FILE = "performance-budget.yaml";

/** LHR の置き場。落ちた画面を後から開くために残す。追跡はしない。 */
const OUTPUT_DIR = "tmp/lighthouse";

/**
 * Lighthouse の CLI。
 *
 * @remarks
 * **Node の API ではなく子プロセスとして呼びます。** Lighthouse は計測用の関数を文字列へ落として
 * ページの中で評価しますが、この scripts は tsx（esbuild）を通って読み込まれ、esbuild は関数名を
 * 保つための補助関数を本文へ差し込みます。差し込まれた呼び出しはページの中に存在せず、最初の
 * 計測で `__name is not defined` として落ちます。子プロセスなら素の node が読むので変換が挟まり
 * ません。
 */
const LIGHTHOUSE_CLI = createRequire(import.meta.url).resolve("lighthouse/cli/index.js");

/**
 * 役割を持つ session を発行し、それを送るためのヘッダの宣言をファイルへ書き出す。
 *
 * @remarks
 * cookie の名前を写さず、返ってきた `Set-Cookie` をそのまま組み直します。名前を書き写すと、
 * 封緘の実装が名前を変えたときにここだけが古い名前を送り続け、ログインへ送られた画面を
 * 計測してしまいます。
 *
 * **返すのは値ではなくファイルの場所です。** `--extra-headers` は JSON そのものも受け取りますが、
 * それだと session が子プロセスの起動引数に載り、同じ機械の他の利用者が `ps` で読めます。この
 * session は役割を持つ本物で、読めた相手は同じ待ち受けへ admin として振る舞えます。
 *
 * @returns 書き出したヘッダ宣言のパス。
 */
async function issueSessionHeaders(baseUrl: string, role: string): Promise<string> {
  const response = await fetch(new URL(TEST_SESSION_PATH, baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role }),
  });

  if (response.status !== TEST_SESSION_ISSUED_STATUS) {
    throw new Error(
      `${TEST_SESSION_PATH} が session を発行しませんでした（${response.status}）。` +
        "この口が開くのは APP_ENV が local / ci のときだけです。",
    );
  }

  const cookies = response.headers.getSetCookie();

  if (cookies.length === 0) {
    throw new Error(`${TEST_SESSION_PATH} が cookie を返しませんでした`);
  }

  const path = join(OUTPUT_DIR, `headers-${role}.json`);

  writeFileSync(path, JSON.stringify({ Cookie: buildCookieHeader(cookies) }));

  return path;
}

/**
 * 画面を 1 回測り、LHR を置き場へ書き出して指標を返す。
 *
 * @remarks
 * ブラウザは Lighthouse が `CHROME_PATH` から起動します。**銘柄も版もここでは選びません** ——
 * 版は lockfile の `@playwright/test` が決め、実体を入れるのは `make lighthouse` の手前の段です。
 *
 * @param headersFile - 送るヘッダの宣言。役割の要らない画面では `undefined`。
 */
function runOnce(target: Target, run: number, headersFile: string | undefined): MetricValues {
  const output = join(OUTPUT_DIR, `${target.name}-${run}.json`);
  const result = spawnSync(
    process.execPath,
    buildLighthouseArgs(
      LIGHTHOUSE_CLI,
      target,
      output,
      headersFile,
      buildChromeFlags({ CI: process.env.CI }),
    ),
    { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: "inherit" },
  );

  // 起動そのものに失敗した場合、`status` は null で理由は `error` にしか入りません。終了コード
  // だけを見ると「終了コード null」だけが残り、ブラウザを起動できなかったのか計測が落ちたのかを
  // 見分けられません。
  if (result.error !== undefined) {
    throw new Error(`${target.url} の計測を起動できませんでした`, { cause: result.error });
  }

  if (result.status !== 0) {
    throw new Error(`${target.url} の計測が失敗しました（終了コード ${String(result.status)}）`);
  }

  return readMetrics(JSON.parse(readFileSync(output, "utf8")));
}

/** 画面 1 つを繰り返し測り、中央値を返す。 */
function measure(target: Target, runs: number, headersFile: string | undefined): Measurement {
  const values: MetricValues[] = [];

  for (let run = 1; run <= runs; run += 1) {
    values.push(runOnce(target, run, headersFile));
  }

  return { name: target.name, values: aggregate(values) };
}

async function main(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL;

  if (baseUrl === undefined) {
    throw new Error("E2E_BASE_URL がありません。make lighthouse から呼んでください。");
  }

  const budget = parseBudget(readFileSync(BUDGET_FILE, "utf8"));
  const screens = resolveScreens(
    listScreenRoutes(readFileSync(SCREEN_MANIFEST_FILE, "utf8")),
    SCREENS,
  );

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const headerFiles = new Map<string, string>();
  const measurements: Measurement[] = [];

  for (const target of planTargets(screens, baseUrl)) {
    if (target.role !== undefined && !headerFiles.has(target.role)) {
      headerFiles.set(target.role, await issueSessionHeaders(baseUrl, target.role));
    }

    console.error(`⏱️  ${target.name}`);
    measurements.push(
      measure(
        target,
        budget.runs.count,
        target.role === undefined ? undefined : headerFiles.get(target.role),
      ),
    );
  }

  const missing = missingScreens(measurements, budget);

  if (missing.length > 0) {
    console.error(
      `❌ ${BUDGET_FILE} が緩和を持つ画面が居ません: ${missing.join(", ")}\n` +
        "画面の名前を変えたなら宣言も直してください。",
    );
    process.exitCode = 1;

    return;
  }

  const verdicts = judge(measurements, budget);

  console.log(renderReport(verdicts, budget.runs.count));

  if (hasFailure(verdicts)) {
    console.error("\n❌ Core Web Vitals が予算を超えました。");
    process.exitCode = 1;

    return;
  }

  console.log("\n✅ 全ての画面が予算に収まっています。");
}

// トップレベル await にしない。tsx は CJS へ落とすので変換の時点で落ちる。
main().catch((error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { chromium } from "@playwright/test";
import { TEST_SESSION_ISSUED_STATUS, TEST_SESSION_PATH } from "../../e2e/lib/dev-session";
import {
  listScreenRoutes,
  resolveScreens,
  SCREEN_MANIFEST_FILE,
  SCREENS,
  selectScreens,
} from "../../e2e/lib/screens";
import { parseNumstat } from "../lib/numstat";
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
import { decideTrigger } from "./trigger";

/**
 * 画面ごとの Core Web Vitals を測り、予算と照らす。
 *
 * 使い方:
 *
 *   `tsx scripts/lighthouse`                     画面を測り、予算と照らす（`make lighthouse`）
 *   `tsx scripts/lighthouse trigger <base ref>`  その差分を PR で測るべきかを GitHub の出力へ書く
 *
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

/**
 * 差分を判定し、GitHub Actions の出力へ書く。
 *
 * @remarks
 * `kind` が `force` なら計測へ進み、`alert` なら知らせるだけです。判定そのものは
 * [`trigger.ts`](trigger.ts) が持ちます。
 */
function trigger(baseRef: string): void {
  const budget = parseBudget(readFileSync(BUDGET_FILE, "utf8"));
  const numstat = spawnSync("git", ["diff", "--numstat", `${baseRef}...HEAD`], {
    encoding: "utf8",
  });

  if (numstat.status !== 0) {
    throw new Error(`${baseRef} との差分を取れませんでした。base を fetch していますか。`);
  }

  const decision = decideTrigger(parseNumstat(numstat.stdout), budget.pullRequest.alertAt);
  const output = process.env.GITHUB_OUTPUT;

  if (output === undefined) {
    throw new Error("GITHUB_OUTPUT がありません。この副命令は CI から呼ばれます。");
  }

  appendFileSync(
    output,
    [
      `kind=${decision.kind}`,
      `detail=${decision.kind === "force" ? decision.reasons.join(" / ") : ""}`,
      `changed-lines=${decision.kind === "alert" ? decision.changedLines : 0}`,
      "",
    ].join("\n"),
  );

  console.error(`🔎 ${decision.kind}`);
}

async function measureAll(): Promise<void> {
  const baseUrl = process.env.E2E_BASE_URL;

  if (baseUrl === undefined) {
    throw new Error("E2E_BASE_URL がありません。make lighthouse から呼んでください。");
  }

  const budget = parseBudget(readFileSync(BUDGET_FILE, "utf8"));

  // 絞りは撮影側と同じ入口を使う（`E2E_ONLY`）。1 枚を見たいだけの実行が全画面を回すと、
  // 手元では 16 分を払うことになり、実際には誰も回さなくなる。
  const screens = selectScreens(
    resolveScreens(listScreenRoutes(readFileSync(SCREEN_MANIFEST_FILE, "utf8")), SCREENS),
    process.env.E2E_ONLY,
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

  // 絞った実行では見ない。在るべき画面の集合が絞った側に縮み、対象外の緩和がすべて
  // 「居ない画面への宣言」として上がる（`selectScreens` が撮影側について言うのと同じ）。
  const missing = process.env.E2E_ONLY ? [] : missingScreens(measurements, budget);

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

function main(): Promise<void> {
  const [command, baseRef] = process.argv.slice(2);

  if (command === "trigger") {
    if (baseRef === undefined) {
      return Promise.reject(new Error("usage: lighthouse trigger <base ref>"));
    }

    trigger(baseRef);

    return Promise.resolve();
  }

  return measureAll();
}

// トップレベル await にしない。tsx は CJS へ落とすので変換の時点で落ちる。
main().catch((error: unknown) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

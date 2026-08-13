import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";

import { hasFailure, judge, type Measurement, missingRoutes, parseBudget } from "./budget";
import {
  artifactDirOf,
  initialChunks,
  type RouteBuildManifest,
  type RscManifest,
} from "./manifest";
import { renderReport } from "./report";

/**
 * client JavaScript の量を成果物から測り、予算と照らす。
 *
 * 使い方: `tsx scripts/bundle-budget [<current .next>] [<base .next>]`
 *
 * base を渡さない場合は増分を判定せず、上限だけを見る。
 */

const BUDGET_FILE = "performance-budget.yaml";

function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}

/** `__RSC_MANIFEST` を副作用なく取り出す。 */
function readRscManifest(path: string, pagePath: string): RscManifest | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  const context: { __RSC_MANIFEST?: Record<string, RscManifest> } & Record<string, unknown> = {};
  context.globalThis = context;
  runInNewContext(readFileSync(path, "utf8"), context);

  return context.__RSC_MANIFEST?.[pagePath];
}

function measure(dir: string): Measurement[] {
  const routes = readJson<Record<string, string>>(`${dir}/app-path-routes-manifest.json`);

  if (routes === undefined) {
    throw new Error(`${dir} に app-path-routes-manifest.json がありません。build しましたか。`);
  }

  // route handler は client bundle を持たない。0 KB の行を並べても読む人が得るものが無い。
  const pages = Object.entries(routes).filter(([pagePath]) => pagePath.endsWith("/page"));

  return pages.map(([pagePath, route]) => {
    const artifact = `${dir}/${artifactDirOf(pagePath)}`;
    const chunks = initialChunks(
      readRscManifest(`${artifact}_client-reference-manifest.js`, pagePath),
      readJson<RouteBuildManifest>(`${artifact}/build-manifest.json`),
    );

    let gzip = 0;
    for (const chunk of chunks) {
      const path = `${dir}/${chunk}`;
      if (existsSync(path)) {
        gzip += gzipSync(readFileSync(path)).length;
      }
    }

    return { route, gzip };
  });
}

function main(): void {
  const [current = ".next", base] = process.argv.slice(2);
  const budget = parseBudget(readFileSync(BUDGET_FILE, "utf8"));
  const measured = measure(current);
  const missing = missingRoutes(measured, budget);

  if (missing.length > 0) {
    console.error(
      `❌ ${BUDGET_FILE} が上限を持つ route が build に居ません: ${missing.join(", ")}\n` +
        "route の名前を変えたなら宣言も直してください。",
    );
    process.exitCode = 1;

    return;
  }

  const verdicts = judge(measured, base === undefined ? [] : measure(base), budget);

  console.log(renderReport(verdicts));

  if (hasFailure(verdicts)) {
    console.error("\n❌ client JavaScript が予算を超えました。");
    process.exitCode = 1;

    return;
  }

  console.log("\n✅ client JavaScript は予算に収まっています。");
}

main();

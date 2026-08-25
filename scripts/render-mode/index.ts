import { existsSync, readFileSync } from "node:fs";

import {
  findRenderModeDrift,
  formatRenderModeDrift,
  type Page,
  type PrerenderManifest,
  prerenderedRoutes,
} from "./render-mode";

/**
 * 画面をどう描くかの宣言と、build がそう扱ったかを突き合わせる。
 *
 * 使い方: `tsx scripts/render-mode [<.next>]`
 *
 * build の成果物を読むので、`next build` の後に走らせる。
 */

/**
 * 突合しない route。
 *
 * @remarks
 * framework が持つ route で、アプリの判断ではありません。どちらもバックエンドから何も取らずに
 * 描けるため、Next.js は常に固めます。`favicon.ico` はそもそも画面ではありません。
 */
const EXEMPT = ["/_not-found", "/_global-error", "/favicon.ico"];

/** 内部 page パスから、その page ファイルの位置を組み立てる。 */
function sourceOf(pagePath: string): string {
  return `src/app${pagePath}.tsx`;
}

function main(): void {
  const [dir = ".next"] = process.argv.slice(2);
  const routesFile = `${dir}/app-path-routes-manifest.json`;

  if (!existsSync(routesFile)) {
    console.error(`❌ ${dir} に app-path-routes-manifest.json がありません。build しましたか。`);
    process.exitCode = 1;

    return;
  }

  const routes = JSON.parse(readFileSync(routesFile, "utf8")) as Record<string, string>;
  const manifest = JSON.parse(
    readFileSync(`${dir}/prerender-manifest.json`, "utf8"),
  ) as PrerenderManifest;

  const pages: Page[] = Object.entries(routes)
    .filter(([pagePath]) => pagePath.endsWith("/page"))
    .flatMap(([pagePath, route]) => {
      const source = sourceOf(pagePath);

      return existsSync(source) ? [{ route, content: readFileSync(source, "utf8") }] : [];
    });

  // 走査が空振りすると、違反ゼロを報告したままゲートが黙る。違反より先に「見た件数」を主張する。
  if (pages.length === 0) {
    console.error("❌ page を 1 枚も読めませんでした。成果物と `src/app` の対応が崩れています。");
    process.exitCode = 1;

    return;
  }

  const drift = findRenderModeDrift(prerenderedRoutes(manifest), pages, EXEMPT);

  if (drift.length > 0) {
    console.error(
      `❌ 描画モードの宣言と実態が食い違っています。\n\n${formatRenderModeDrift(drift)}`,
    );
    process.exitCode = 1;

    return;
  }

  console.log(`✅ ${pages.length} 枚の描画モードは宣言どおりです。`);
}

main();

// 画面をどう描くかの宣言と、build がそう扱ったかの突合。

/** `src/app` の page 1 枚。 */
export type Page = {
  /** 公開されている route。 */
  readonly route: string;
  /** その page ファイルの中身。 */
  readonly content: string;
};

/** 宣言と実態が食い違った route。 */
export type RenderModeDrift = {
  /** 食い違っている route。 */
  readonly route: string;
  /** どちらへ食い違っているか。 */
  readonly reason: "undeclared-static" | "declared-but-dynamic";
};

/**
 * `prerender-manifest.json` のうち、固まった route を知るのに要る形だけ。
 *
 * @remarks
 * `routes` の鍵は**解決済みの具体パス**です。`generateStaticParams` を持つ route は
 * `/products/1` のように 1 件ずつ並び、元のパターンは `srcRoute` が持ちます。パターン自身は
 * `dynamicRoutes` の側に居ます。
 */
export type PrerenderManifest = {
  readonly routes?: Readonly<Record<string, { readonly srcRoute?: string | null }>>;
  readonly dynamicRoutes?: Readonly<Record<string, unknown>>;
};

/**
 * 固まった route を、`src/app` が使うパターンの綴りへ畳み戻す。
 *
 * @remarks
 * 鍵をそのまま使うと、動的セグメントを持つ route が**必ず**二重に誤検知されます。解決済みの
 * `/products/1` は宣言側（`/products/[id]`）と一致せず「宣言なしに固まった」に、パターン
 * `/products/[id]` は固まった側に現れず「宣言したのに動的」に、同時に挙がります。
 */
export function prerenderedRoutes(manifest: PrerenderManifest): string[] {
  const found = new Set<string>();

  for (const [route, entry] of Object.entries(manifest.routes ?? {})) {
    found.add(entry.srcRoute ?? route);
  }

  for (const route of Object.keys(manifest.dynamicRoutes ?? {})) {
    found.add(route);
  }

  return [...found];
}

/** 「build 時に固める」の宣言。 */
// 空白は行内のものだけを許す。`\s` は改行を含むため、複数行にまたがる解釈が生まれて後戻りする。
const FORCE_STATIC = /^[ \t]*export[ \t]+const[ \t]+dynamic[ \t]*=[ \t]*["']force-static["']/m;

/**
 * build 時に固めると宣言している route。
 *
 * @remarks
 * 宣言を **page ファイル自身**から読むのは、置き場を 1 つに保つためです。route の一覧を別の
 * ファイルへ持つと、画面を足した人が 2 箇所へ書くことになり、片方だけを足した状態が「宣言どおり」
 * として通ります。
 */
export function declaredStaticRoutes(pages: readonly Page[]): string[] {
  return pages.filter((page) => FORCE_STATIC.test(page.content)).map((page) => page.route);
}

/**
 * 宣言と実態を突き合わせる。
 *
 * @remarks
 * **build 時に固まった画面は、型検査もテストも通ります。** CI は緑のまま、配るものだけが古く
 * なります。バックエンドが持つ状態を映す画面でこれが起きると、更新が反映されないうえに、build に
 * バックエンドへの到達性を要求します（[0011](../../docs/adr/0011-no-docker.md) の役割分担では
 * build 時にバックエンドが居るとは限りません）。
 *
 * **逆向きも見ます。** 宣言したのに動的のままなら、その宣言は効いていません。request 時の API を
 * 1 つ足しただけで起きるので、宣言を残したまま黙って外れます。
 *
 * @param prerendered - build が固めた route（{@link prerenderedRoutes}）。
 * @param pages - `src/app` の page と、その中身。
 * @param exempt - framework が持つ route。アプリの判断ではないので突合しない。
 */
export function findRenderModeDrift(
  prerendered: readonly string[],
  pages: readonly Page[],
  exempt: readonly string[],
): RenderModeDrift[] {
  const exemptSet = new Set(exempt);
  const staticSet = new Set(prerendered.filter((route) => !exemptSet.has(route)));
  const declaredSet = new Set(declaredStaticRoutes(pages));

  return [
    ...[...staticSet]
      .filter((route) => !declaredSet.has(route))
      .map((route) => ({ route, reason: "undeclared-static" as const })),
    ...[...declaredSet]
      .filter((route) => !staticSet.has(route))
      .map((route) => ({ route, reason: "declared-but-dynamic" as const })),
  ].sort((a, b) => a.route.localeCompare(b.route));
}

/** 見つかったものを人が読む形にする。 */
export function formatRenderModeDrift(drift: readonly RenderModeDrift[]): string {
  return drift
    .map(({ route, reason }) =>
      reason === "undeclared-static"
        ? `${route}: build 時に固まっています。固めてよいなら page で \`export const dynamic = "force-static"\` を宣言し、そうでないなら固まる原因（request 時の API を触らない取得）を断ってください。`
        : `${route}: \`force-static\` を宣言していますが動的に描かれています。宣言が効いていないので、外すか原因を取り除いてください。`,
    )
    .join("\n");
}

// 画面をどう描くかの宣言と、build がそう扱ったかの突合。

/**
 * build がその route の殻をどこまで配れるか。
 *
 * @remarks
 * `prerender-manifest.json` の `compute` をそのまま採らず 3 つへ畳むのは、ゲートが見たいのが
 * **殻を配れるかどうか**だからです。`static` と `resuming` はどちらも配れる側で、区別は報告の
 * ためだけに残します。
 */
export type RenderMode = "static" | "partial" | "blocking";

/** 宣言と実態が食い違った route。 */
export type RenderModeDrift = {
  /** 食い違っている route。 */
  readonly route: string;
  /** どちらへ食い違っているか。 */
  readonly reason: "undeclared-blocking" | "declared-but-prerendered";
};

/** `prerender-manifest.json` のうち、扱いを知るのに要る形だけ。 */
export type PrerenderManifest = {
  readonly routes?: Readonly<Record<string, { readonly compute?: string }>>;
  readonly dynamicRoutes?: Readonly<Record<string, { readonly compute?: string }>>;
};

/**
 * `compute` を扱いへ畳む。
 *
 * @remarks
 * 知らない綴りは `blocking` へ倒します。**黙って通す側へ倒すと、Next.js が値を増やした日に
 * ゲートが何も言わなくなります。**
 */
function toRenderMode(compute: string | undefined): RenderMode {
  if (compute === "static") {
    return "static";
  }

  return compute === "resuming" ? "partial" : "blocking";
}

/** route ごとに、build が実際に採った扱いを引く。 */
export function renderModes(manifest: PrerenderManifest): Map<string, RenderMode> {
  const found = new Map<string, RenderMode>();

  for (const [route, entry] of [
    ...Object.entries(manifest.routes ?? {}),
    ...Object.entries(manifest.dynamicRoutes ?? {}),
  ]) {
    found.set(route, toRenderMode(entry.compute));
  }

  return found;
}

/**
 * 「殻を配らずにブロックしてよい」の宣言。
 *
 * @remarks
 * Cache Components を有効にすると segment config（`export const dynamic`）は併存しません。
 * 描くモードの宣言はこの 1 つだけになり、置ける場所は page / layout / 並行 slot です。
 */
const ALLOW_BLOCKING = /^[ \t]*export[ \t]+const[ \t]+instant[ \t]*=[ \t]*false/m;

/** その内容が、ブロッキングを許す宣言を持つか。 */
export function allowsBlocking(content: string): boolean {
  return ALLOW_BLOCKING.test(content);
}

/**
 * 宣言と実態を突き合わせる。
 *
 * @remarks
 * 見るのは 2 方向です。**宣言なしにブロックしている**route は、誰かが殻を黙って捨てた跡で、
 * その画面はバックエンドの往復を待ってから 1 バイト目を返すようになっています。逆に**宣言した
 * のにプリレンダーされている**route は、宣言のほうが古く、外せる印が残ったままです。
 *
 * 片方だけを見ると、宣言が実態から離れていく方向にだけ緩みます。
 */
export function findRenderModeDrift(
  observed: ReadonlyMap<string, RenderMode>,
  declared: ReadonlyMap<string, boolean>,
  exempt: readonly string[],
): RenderModeDrift[] {
  const drift: RenderModeDrift[] = [];

  for (const [route, mode] of observed) {
    if (exempt.includes(route)) {
      continue;
    }

    const allowed = declared.get(route);

    if (allowed === undefined) {
      continue;
    }

    if (mode === "blocking" && !allowed) {
      drift.push({ route, reason: "undeclared-blocking" });
    }

    if (mode !== "blocking" && allowed) {
      drift.push({ route, reason: "declared-but-prerendered" });
    }
  }

  return drift.sort((left, right) => left.route.localeCompare(right.route));
}

/** 検出結果を、直せる形の文言へ整える。違反が無ければ空文字。 */
export function formatRenderModeDrift(drift: readonly RenderModeDrift[]): string {
  return drift
    .map(({ route, reason }) =>
      reason === "undeclared-blocking"
        ? `${route}: 殻を配れていません。取得を \`Suspense\` の内側へ落とすか、ブロックしてよい理由を添えて \`export const instant = false\` を宣言してください`
        : `${route}: \`export const instant = false\` が余っています。殻は配れているので宣言を外してください`,
    )
    .join("\n");
}

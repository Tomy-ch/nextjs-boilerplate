/**
 * build 成果物から、route ごとに browser が最初に読む chunk を引く。
 *
 * @remarks
 * `next build` の出力に First Load JS の列は無いため、成果物の側から引きます。route が読む
 * client chunk は 2 系統に分かれます。
 *
 * - **route 固有** — `__RSC_MANIFEST[<page>].clientModules[*].chunks`。その route が参照する
 *   client component の実体
 * - **共有** — route ごとの `build-manifest.json` の `rootMainFiles` / `polyfillFiles`。framework
 *   の runtime と polyfill で、どの route でも読まれる
 *
 * 和集合を取ると、静的 route が出力する HTML の script と一致します。
 */

/** `__RSC_MANIFEST` の 1 route ぶん。必要な形だけを受け取る。 */
export type RscManifest = {
  readonly clientModules?: Readonly<Record<string, { readonly chunks?: readonly string[] }>>;
};

/** route ごとの `build-manifest.json`。必要な形だけを受け取る。 */
export type RouteBuildManifest = {
  readonly rootMainFiles?: readonly string[];
  readonly polyfillFiles?: readonly string[];
};

/** chunk の参照を成果物ディレクトリからの相対へ均す。 */
function toArtifactPath(reference: string): string {
  return reference.replace(/^\/?_next\//, "");
}

/**
 * route が最初に読む JavaScript chunk。
 *
 * @remarks
 * CSS など JavaScript でないものは落とします。予算が見るのは client JS の量です。
 *
 * @param rsc - その route の `__RSC_MANIFEST` の値。route が client component を持たない場合は省略。
 * @param build - その route の `build-manifest.json`。
 * @returns 重複を畳んだ、成果物ディレクトリからの相対パス。
 */
export function initialChunks(
  rsc: RscManifest | undefined,
  build: RouteBuildManifest | undefined,
): string[] {
  const found = new Set<string>();

  for (const entry of Object.values(rsc?.clientModules ?? {})) {
    for (const chunk of entry.chunks ?? []) {
      found.add(toArtifactPath(chunk));
    }
  }

  for (const chunk of [...(build?.rootMainFiles ?? []), ...(build?.polyfillFiles ?? [])]) {
    found.add(toArtifactPath(chunk));
  }

  return [...found].filter((chunk) => chunk.endsWith(".js"));
}

/**
 * `app-path-routes-manifest.json` の内部 page パスから、成果物のディレクトリを組み立てる。
 *
 * @remarks
 * 内部パスは `/(shop)/products/page` のように末尾が `page` / `route` で、成果物は
 * `server/app/(shop)/products/page/` に置かれます。route group の括弧はそのまま残ります。
 *
 * @param pagePath - `app-path-routes-manifest.json` の key。
 */
export function artifactDirOf(pagePath: string): string {
  return `server/app${pagePath}`;
}

/** 公開 route 1 つぶんの、成果物から引いた chunk。 */
export type RouteChunks = {
  /** 公開 route。 */
  readonly route: string;
  /** その entry が読む chunk。 */
  readonly chunks: readonly string[];
};

/**
 * 同じ公開 route を指す entry の chunk を 1 つへ畳む。
 *
 * @remarks
 * `app-path-routes-manifest.json` の key は成果物の単位であって公開 route の単位ではありません。
 * **並行ルート（`@slot`）を持つ route は entry を複数持ち、その全てが同じ公開 route を指します。**
 * 開いたときの HTML はページとスロットの両方の script を持つので、量は和集合で数えます。
 *
 * entry ごとに数えると、同じ route が複数行に割れるだけでなく、上限も増分もそのうちの 1 つしか
 * 見ません。増分は route 名を鍵に base と突き合わせるので、どの entry が鍵に残るかで結果が変わり
 * ます。
 *
 * @param entries - manifest の entry ごとに引いた chunk。manifest に現れた順で渡します。
 * @returns 公開 route ごとの chunk。順序は最初に現れた entry の順。
 */
export function unionByRoute(entries: readonly RouteChunks[]): RouteChunks[] {
  const byRoute = new Map<string, Set<string>>();

  for (const entry of entries) {
    const found = byRoute.get(entry.route) ?? new Set<string>();

    for (const chunk of entry.chunks) {
      found.add(chunk);
    }

    byRoute.set(entry.route, found);
  }

  return [...byRoute].map(([route, chunks]) => ({ route, chunks: [...chunks] }));
}

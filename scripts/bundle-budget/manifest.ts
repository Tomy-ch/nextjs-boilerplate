/**
 * build 成果物から、route ごとに browser が最初に読む chunk を引く。
 *
 * @remarks
 * `next build` の出力に First Load JS の列は無いため、成果物の側から引きます。route が読む
 * client chunk は 2 系統に分かれます。
 *
 * - **route 固有** — `__RSC_MANIFEST[<page>].clientModules[*].chunks`。その route が参照する
 *   client component の実体
 * - **共有** — route ごとの `build-manifest.json` の `rootMainFiles`。framework の runtime で、
 *   どの route でも読まれる
 *
 * 和集合を取ると、対応ブラウザが静的 route の HTML から読む script と一致します。
 *
 * **`polyfillFiles` は数えません。** Next.js はそれを `<script nomodule>` で出すので、
 * [0102](../../docs/adr/0102-browser-support.md) が対応対象とするブラウザ（Next.js 既定の
 * browserslist = モダン）は一度も取得しません。数えると、誰も読まない約 40 KB が全 route の
 * 数値へ一律に乗り、予算が見ているはずの「開いた人が払う量」から離れます。
 *
 * 初期の一式のほかに 2 つを引きます。
 *
 * - **遅延** — 初期の chunk が読み込み器へ渡す chunk（{@link deferredChunks}）。`next/dynamic` の
 *   先がここに出ます。初期だけを見ると、重いものを遅延へ移した変更が「減った」として通ります
 * - **CSS** — `entryCSSFiles`。描画をブロックするため LCP に直接効きます
 *   （[0101](../../docs/adr/0101-performance-budget.md)）
 */

/** `__RSC_MANIFEST` の 1 route ぶん。必要な形だけを受け取る。 */
export type RscManifest = {
  readonly clientModules?: Readonly<Record<string, { readonly chunks?: readonly string[] }>>;
  readonly entryCSSFiles?: Readonly<Record<string, readonly { readonly path: string }[]>>;
};

/** route ごとの `build-manifest.json`。必要な形だけを受け取る。 */
export type RouteBuildManifest = {
  readonly rootMainFiles?: readonly string[];
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

  for (const chunk of build?.rootMainFiles ?? []) {
    found.add(toArtifactPath(chunk));
  }

  return [...found].filter((chunk) => chunk.endsWith(".js"));
}

/**
 * route が最初に読む CSS。
 *
 * @remarks
 * `entryCSSFiles` は route の木に居る entry（layout / page / error / 並行ルート）ごとに並びます。
 * 開いたときに読まれるのはその和なので、初期 JS と同じく和集合で数えます。
 *
 * @param rsc - その route の `__RSC_MANIFEST` の値。
 * @returns 重複を畳んだ、成果物ディレクトリからの相対パス。
 */
export function entryStylesheets(rsc: RscManifest | undefined): string[] {
  const found = new Set<string>();

  for (const entry of Object.values(rsc?.entryCSSFiles ?? {})) {
    for (const file of entry) {
      found.add(toArtifactPath(file.path));
    }
  }

  return [...found];
}

/**
 * chunk の中身が名指ししている chunk。
 *
 * @remarks
 * Turbopack は遅延読み込みを、**読み込む chunk のパスを文字列として埋め込んだ小さな chunk**として
 * 出します（`Promise.all([...].map((path) => load(path)))` の形）。遅延の先は manifest のどこにも
 * 現れないため、成果物の側からはこの綴りが唯一の手がかりになります。
 *
 * **この綴りは Turbopack の出力形式に依存します。** 形が変わると抽出が 0 件へ落ち、遅延の量が
 * 「無い」として通ります。抽出できた件数を報告へ載せてあるのはそのためで、0 件は「遅延が無い」
 * とも「読めなくなった」とも読める合図です。
 */
const CHUNK_REFERENCE = /static\/chunks\/[A-Za-z0-9_@./-]+?\.(?:js|css)/g;

/**
 * 初期の一式から辿り着ける、遅延読み込みの chunk。
 *
 * @remarks
 * 初期の chunk が名指しする chunk を推移的に閉じ、初期そのものを引きます。開いた人が必ず払う量
 * ではなく、**その画面を使い切ると払う量**です。`next/dynamic` の先へ移した分がここへ現れるので、
 * 初期と合わせて見ると「移しただけ」と「減らした」を区別できます。
 *
 * @param initial - 初期に読む chunk（{@link initialChunks}）。
 * @param read - chunk の中身を読む。読めない場合は null。
 * @returns 初期を含まない、遅延で読みうる chunk。
 */
export function deferredChunks(
  initial: readonly string[],
  read: (chunk: string) => string | null,
): string[] {
  // 初期のものを最初から見たことにしておく。こうすると「まだ見ていない」がそのまま「遅延」
  // になり、初期かどうかをもう一度確かめる分岐が要らない。
  const seen = new Set(initial);
  // 走査の途中で伸ばす。Array の反復子は毎回 length を読み直すので、押し込んだ先も同じ回で辿る。
  const queue = [...initial];
  const found: string[] = [];

  for (const current of queue) {
    const content = read(current);

    if (content === null) {
      continue;
    }

    for (const reference of content.match(CHUNK_REFERENCE) ?? []) {
      if (seen.has(reference)) {
        continue;
      }

      seen.add(reference);
      queue.push(reference);
      found.push(reference);
    }
  }

  return found;
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

/** 公開 route 1 つぶんの、成果物から引いた資材。 */
export type RouteChunks = {
  /** 公開 route。 */
  readonly route: string;
  /** 初期に読む JS。 */
  readonly initial: readonly string[];
  /** 遅延で読みうる JS。 */
  readonly deferred: readonly string[];
  /** 初期に読む CSS。 */
  readonly css: readonly string[];
};

/**
 * 同じ公開 route を指す entry の資材を 1 つへ畳む。
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
 * @param entries - manifest の entry ごとに引いた資材。manifest に現れた順で渡します。
 * @returns 公開 route ごとの資材。順序は最初に現れた entry の順。
 */
export function unionByRoute(entries: readonly RouteChunks[]): RouteChunks[] {
  const byRoute = new Map<
    string,
    { initial: Set<string>; deferred: Set<string>; css: Set<string> }
  >();

  for (const entry of entries) {
    const found = byRoute.get(entry.route) ?? {
      initial: new Set<string>(),
      deferred: new Set<string>(),
      css: new Set<string>(),
    };

    for (const chunk of entry.initial) found.initial.add(chunk);
    for (const chunk of entry.deferred) found.deferred.add(chunk);
    for (const chunk of entry.css) found.css.add(chunk);

    byRoute.set(entry.route, found);
  }

  return [...byRoute].map(([route, found]) => ({
    route,
    initial: [...found.initial],
    // 別の entry が初期で読むものは、この route にとって遅延ではない。
    deferred: [...found.deferred].filter((chunk) => !found.initial.has(chunk)),
    css: [...found.css],
  }));
}

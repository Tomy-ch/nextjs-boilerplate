// 破棄する対象の宣言。ここはデータだけを持ち、消し方は index.ts が担う。
//
// 宣言を 1 箇所に集めるのは、削除と検証が同じ表を読む必要があるためである。片方が独自の
// 一覧を持つと、消したのに検証が知らない対象や、検証だけが要求する対象が生まれる。

/**
 * まるごと消すパス（リポジトリルート相対）。ディレクトリは配下ごと消す。
 *
 * @remarks
 * サンプルは EC の題材を持つ画面群と、その題材に固有のカーネルモジュール・契約・モックで
 * 構成されます。**外から参照されていないことを前提に自己完結した集合**にしてあり、ここに
 * 挙げていないものへの参照が残ると削除後の build が落ちます。
 *
 * 契約（`openapi/*.gen.yaml`）と生成物（`src/adapters/gen`）も対象です。どちらもサンプルの
 * バックエンドから取り込んだもので、fork 先は自分の契約を置いて生成し直します。生成物を
 * 残すと、題材の型が大量に残って「消してよいのか」の判断を fork 先に負わせます。
 *
 * 破棄の道具そのものも対象です。**ディレクトリごと挙げる**のは、判定モジュールを足したときに
 * 列挙から漏れ、消えたはずの道具の一部だけが fork 先へ居座るのを防ぐためです。
 *
 * `vrt/screenshots` はサブモジュールなので、ここからは中身を消せません。題材の基準画像は
 * fork 先が `make setup-vrt-images` で自分の置き場へ張り替えた時点で参照が切れます
 * （[vrt/README.md](../../../vrt/README.md)）。
 */
export const SAMPLE_PATHS: readonly string[] = [
  // 画面
  "src/app/(shop)",
  "src/features/products",
  "src/features/cart",
  "src/features/home",
  "src/features/account",
  "src/features/site-info",
  // 題材の増分取得を中継する BFF。`src/app/api` ごとではなく題材の口だけを挙げる。
  // 認証の口（`src/app/api/auth`）は同じ場所にあるコア残留である。
  "src/app/api/products",
  // 題材に固有のカーネルモジュール
  "src/model/product",
  "src/model/purchase",
  "src/model/user",
  "src/stores/cart-store.ts",
  "src/stores/cart-store.test.ts",
  // 題材の契約に固有の adapter
  "src/adapters/server/api",
  "src/adapters/client/api",
  // 契約と生成物
  "src/adapters/gen",
  "openapi/api.gen.yaml",
  "openapi/auth.gen.yaml",
  // 契約から生成したモック
  "mocks/api",
  "mocks/auth",
  "mocks/contract-conformance.test.ts",
  "mocks/handlers.test.ts",
  // 題材の画面を通す E2E。土台（`e2e/lib` / `e2e/visual`）と、題材に依らない認証の前捌きは残す。
  "e2e/journeys/browse.spec.ts",
  "e2e/journeys/responsive.spec.ts",
  // 破棄の道具（使い終わったら不要）。ディレクトリごと挙げれば、判定モジュールを足しても漏れない。
  "scripts/setup/remove-sample",
];

// verify 自身は検証の後に自分で消える（`selfDestructTargets`）。ここへ登録すると、検証の前に
// 消えて検証そのものが走らない。

/**
 * 破棄後に実装へ残っていてはいけない題材の語彙。
 *
 * @remarks
 * 検証側はこれをスナップショット経由で受け取ります。**検証は削除の後に走り、その時点でこの
 * モジュールは消えている**ため、import では渡せません。宣言をここに置くのは、破棄する対象と
 * 残留を探す語彙が同じ表から出る必要があるからです。
 *
 * 英語の語には語境界を付けます。付けないと別語の一部に当たります（`CartesianGrid` が `cart` に
 * 一致し、題材と無関係な部品が消し残しとして報告されます）。
 */
export const DANGLING_PATTERN = "商品|カート|在庫|購入|注文|\\bproducts\\b|\\bcart\\b";

// 破棄後に手で戻すもの（削除では表せない）:
// - `performance-budget.yaml` の `growth.gzipKb` を 30 から 10 へ。広げてあるのは、器の内と外で
//   route を移すとその route が器の client 島をまとめて背負うためで、サンプルが消えれば起きない

/** マーカーの名前。`sample:begin` / `sample:end` / `sample:line` / `sample:replace-*` を作る。 */
export const SAMPLE_MARKER = "sample";

/**
 * 走査から外すディレクトリ名。
 *
 * @remarks
 * 依存の取得物と VCS の内部、および生成物です。除去しても再生成で戻るものへ書き込むと、
 * 次の生成で消えるうえ drift ゲートが落ちます。
 */
export const EXCLUDED_DIRECTORIES: Set<string> = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".next",
  "storybook-static",
]);

/** 走査から外す相対パス接頭辞。いずれも生成物か作業用の置き場。 */
export const EXCLUDED_PATH_PREFIXES: readonly string[] = [
  "docs/portal/guides/",
  "graphify-out/",
  "tmp/",
  "src/app/generated/",
  "src/model/generated/",
];

/**
 * マーカーを持てない拡張子。
 *
 * @remarks
 * コメントを書けない形式なので、マーカーの対象になり得ません。削除の対象にはなりますが、走査では
 * 読み込む前に外します。読んでから「テキストではなかった」と判る形にすると、実行のたびに意味の
 * ない警告が出ます。
 */
export const BINARY_EXTENSIONS: readonly string[] = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".pdf",
  ".zip",
];

/**
 * マーカー文字列を「データ・散文」として持つファイル。走査の対象から外す。
 *
 * @remarks
 * 除去はリポジトリを走査します。対象ファイルの一覧を持たないのは、**一覧の外側にマーカーを
 * 書けてしまい、しかもその取りこぼしが無言だから**です。代わりに要るのがこの逆向きの宣言です。
 *
 * 非対称なのは、こちらの取りこぼしが**声を出す**点です。ただし声が出るのは**対応の取れていない
 * マーカーを持つ場合**に限ります。閉じたペアを散文が持っていると、その区間は例外を出さずに消え、
 * 文章が欠けただけでは検査を通ります。除去した行数を実行時に出しているのは、その場合に人が
 * 気づけるようにするためです。
 */
export const MARKER_LITERAL_FILES: readonly string[] = [
  // マーカー除去そのもののテスト。入力としてマーカーの形を持つ。
  "scripts/setup/lib/markers.test.ts",
  // マーカーの名前と形を宣言・説明している当ファイル自身。
  "scripts/setup/remove-sample/sample-manifest.ts",
  // 破棄の手順を説明する散文。マーカーの書き方をそのまま載せている。
  "docs/plan/v1-implementation-plan.md",
];

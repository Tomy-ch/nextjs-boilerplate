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
 */
export const SAMPLE_PATHS: readonly string[] = [
  // 画面
  "src/app/(shop)",
  "src/features/products",
  "src/features/cart",
  // 題材に固有のカーネルモジュール
  "src/model/product",
  "src/stores/cart-store.ts",
  "src/stores/cart-store.test.ts",
  // 題材の契約に固有の adapter
  "src/adapters/server/api",
  // 契約と生成物
  "src/adapters/gen",
  "openapi/api.gen.yaml",
  "openapi/auth.gen.yaml",
  // 題材の画面に対応する基準画像。系統ごとに分かれているので系統単位で落とせる
  // （[story の系統](../../../vrt/lib/story-index.ts)）。
  "vrt/__screenshots__/features",
  "vrt/__screenshots__/page",
  // 契約から生成したモック
  "mocks/api",
  "mocks/auth",
  "mocks/contract-conformance.test.ts",
  // 破棄の道具（使い終わったら不要）
  "scripts/setup/remove-sample",
  "scripts/setup/lib/markers.ts",
  "scripts/setup/lib/markers.test.ts",
];

// verify 自身は検証の後に自分で消える（`selfDestructTargets`）。ここへ登録すると、検証の前に
// 消えて検証そのものが走らない。

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
 * 非対称なのは、こちらの取りこぼしが**声を出す**点です。宣言し忘れたファイルは内容が壊れ、
 * purge 検証 CI の `lint:ci` / `md-lint` / `build` / `test` が落ちます。
 */
export const MARKER_LITERAL_FILES: readonly string[] = [
  // マーカー除去そのもののテスト。入力としてマーカーの形を持つ。
  "scripts/setup/lib/markers.test.ts",
  // マーカーの名前と形を宣言・説明している当ファイル自身。
  "scripts/setup/remove-sample/sample-manifest.ts",
  // 破棄の手順を説明する散文。マーカーの書き方をそのまま載せている。
  "docs/plan/v1-implementation-plan.md",
];

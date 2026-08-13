/**
 * 検査対象から外すモジュールの宣言。
 *
 * @remarks
 * カバレッジの母数と 1:1 ゲートは、同じ理由で同じモジュールを外します。宣言をここ 1 箇所に
 * 置くのは、2 箇所に書くと片方だけを直したときに黙ってずれるためです。ずれる向きは
 * 「カバレッジからは外れているのにゲートは要求する」(開発が止まる)か、「ゲートからは
 * 外れているのにカバレッジは要求する」(検査されない判定が増える)のどちらかで、後者は
 * 気づかれないまま進みます。
 *
 * パターンはリポジトリルート相対で、`*` は区切りを跨がない任意文字、末尾 `/**` は
 * ディレクトリ接頭辞として扱います。vitest のカバレッジ除外もこの配列をそのまま読みます。
 */

/**
 * 入口ファイル。CLI 引数の受け取り・ファイル入出力・終了コードだけを担い、判定は同じ
 * ディレクトリの判定モジュールへ切り出してある。
 *
 * @remarks
 * 撤去条件は、当該入口が判定を持ち始めた時点。入口に分岐が生えたらここから外し、判定を
 * 隣のモジュールへ移すか、入口そのものにテストを書く。
 */
export const ENTRYPOINT_PATTERNS = [
  "scripts/*/index.ts",
  "scripts/setup/*/index.ts",
  // portal と openapi は 1 ディレクトリに入口が複数あるツール群で、`index.ts` へ畳めない。
  "scripts/portal/gen-*.ts",
  "scripts/portal/build-site.ts",
  "scripts/openapi/fetch-api.ts",
  "scripts/openapi/check-generated.ts",
] as const;

/**
 * 契約から生成されるモジュール。
 *
 * @remarks
 * 書き手が居ないコードにテストを課しても、検証しているのは生成器であって本リポジトリの
 * 判断ではありません([0072](../../docs/adr/0072-api-type-generation.md))。生成物の正しさは
 * 契約からの再生成が一致するか(drift ゲート)と、`mocks/contract-conformance.test.ts` の
 * 全ハンドラ検査が担保します。
 */
export const GENERATED_MODULES = ["src/adapters/gen/**", "mocks/api/**", "mocks/auth/**"] as const;

/**
 * 判定を持たないモジュール。
 *
 * - `scripts/setup/lib/runtime.ts` — リポジトリルートの解決と共通フラグ（`--dry-run` / `--help`）の解析だけ。
 * - `docs-viewer/src/main.tsx` — ビューアーの entry。読み込まれた時点で DOM を触るため、
 *   判断はすべて `mount/` 側に置いてある。
 */
const NON_DECIDING_MODULES = ["scripts/setup/lib/runtime.ts", "docs-viewer/src/main.tsx"] as const;

/**
 * テスト専用の組み立て。
 *
 * @remarks
 * 判定を持たず、検証を通る入力一式を用意するだけ。テストが自分の分だけを組み立てると、
 * 他の purpose の欠落で落ちて検査したい判定へ到達しないため 1 箇所に置いてあります。
 */
const TEST_FIXTURE_MODULES = ["src/config/environment.fixture.ts"] as const;

/**
 * 単体では回せないモジュール。
 *
 * @remarks
 * route segment は `params` / `searchParams` が Promise である App Router の規約と生成型に依存し、
 * 検証は route の経路ごと通す必要があります([0091](../../docs/adr/0091-test-verification-methods.md))。
 * 撤去条件は E2E の着地。
 *
 * feature 側の `page-content.tsx` はここに含めません。取得を `adapters` の module 境界で
 * 差し替えれば `render(await Component(props))` で検証できるためです。
 */
const RUNTIME_ONLY_MODULES = ["src/app/**/page.tsx"] as const;

/**
 * それ自体がテストであるモジュール。
 *
 * @remarks
 * `vrt/*.spec.ts` は Playwright が実行する visual regression の本体で、Vitest からは
 * 呼ばれません。テストにテストを課す形になるため母数から外し、代わりに判定を持つ部分を
 * `vrt/lib/` へ切り出して 1:1 の対象にしています。
 */
const TEST_SUITE_MODULES = ["vrt/*.spec.ts"] as const;

/** カバレッジ母数と 1:1 ゲートの双方が外す対象(リポジトリルート相対)。 */
export const EXCLUDED_FROM_CHECKS = [
  ...ENTRYPOINT_PATTERNS,
  ...GENERATED_MODULES,
  ...NON_DECIDING_MODULES,
  ...TEST_FIXTURE_MODULES,
  ...RUNTIME_ONLY_MODULES,
  ...TEST_SUITE_MODULES,
] as const;

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
export const GENERATED_MODULES = [
  "src/adapters/gen/**",
  "mocks/api/**",
  "mocks/auth/**",
] as const;

/**
 * 判定を持たないモジュール。
 *
 * - `scripts/setup/lib/runtime.ts` — リポジトリルートの解決と commander の生成だけ。
 * - `docs-viewer/src/main.tsx` — ビューアーの entry。読み込まれた時点で DOM を触るため、
 *   判断はすべて `mount/` 側に置いてある。
 */
export const NON_DECIDING_MODULES = [
  "scripts/setup/lib/runtime.ts",
  "docs-viewer/src/main.tsx",
] as const;

/**
 * 単体では回せないモジュール。
 *
 * @remarks
 * async Server Component は描画がサーバランタイム上のデータ取得に依存するため、健全性は
 * HTTP 境界を含む通しでしか確かめられません([0091](../../docs/adr/0091-test-verification-methods.md))。
 * unit で無理に回すと脆い server render mock を積むことになります。撤去条件は E2E の着地。
 */
export const RUNTIME_ONLY_MODULES = [
  "src/app/**/page.tsx",
  "src/features/**/*-page-content.tsx",
] as const;

/** カバレッジ母数と 1:1 ゲートの双方が外す対象(リポジトリルート相対)。 */
export const EXCLUDED_FROM_CHECKS = [
  ...ENTRYPOINT_PATTERNS,
  ...GENERATED_MODULES,
  ...NON_DECIDING_MODULES,
  ...RUNTIME_ONLY_MODULES,
] as const;

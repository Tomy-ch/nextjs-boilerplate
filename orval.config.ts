import { defineConfig } from "orval";

// 契約に載っているが本アプリが呼ばない operation の tag。
//
// health 系と /metrics は運用基盤が叩くものでフロントの接続先ではない。
// internal/types/error-response は ErrorResponse 型を生成させるためだけの擬似エンドポイントで、
// 呼び出し先としては存在しない。除外しても ErrorResponse 自体は各 operation の異常系レスポンスから
// 参照されるため生成される。
const NON_CLIENT_TAGS = [
  "health",
  "healthz",
  "metrics",
  "ready",
  "version",
  "internal/types/error-response",
];

// pattern を持つ項目の値の作り方。
//
// orval は pattern を見つけると `faker.helpers.fromRegExp(パターン)` を出すが、この API は
// `\d` のような短縮クラスもアンカーも解釈せず、パターンの文字列をほぼそのまま返す
// (`^\d+(\.\d+)?$` → `^\dd(\.\d)?$`)。結果としてモックが、同じ契約から生成した zod 検証を
// 通らない。契約に pattern を持つ項目が増えたときの取りこぼしは、全ハンドラの応答を対応する
// zod で検証するテストが捕まえる。
const PATTERNED_MOCK_PROPERTIES = {
  // USD の decimal 文字列。サブセント精度を保つため数値ではなく文字列で表される。
  //
  // `amount` は入れない。参考換算額の中の `amount` は最小単位の整数であり、decimal 文字列を
  // 与えると契約に反する。
  "/^(price|unitPrice|rate|original)$/": () => "19.99",
  // 符号付きの decimal 文字列。
  "/^converted$/": () => "-19.99",
  // 先頭の + は任意で、以降は 10〜15 桁の数字。
  "/^phone$/": () => "09012345678",
  "/^postalCode$/": () => "100-0001",
  // 住所は pattern を持たないが、faker の既定は 10〜100 文字のランダム英字を返す。実在しない
  // 地名では、選択部品の幅も住所 1 行の折り返しも実物と違う姿で確かめることになる。
  "/^prefecture$/": () => "神奈川県",
  "/^city$/": () => "横浜市西区",
};

/**
 * 都道府県マスタのモック応答。
 *
 * @remarks
 * この operation だけ応答そのものを差し替えます。項目名が汎用の `name` なので、上の
 * 項目名による指定では商品名や状態名まで巻き込みます。
 *
 * 全 47 件は置かず、地方の散った 11 件に絞ります。`code` は JIS X 0401 の実際の値であり、
 * 連番ではありません。**間引いても選択部品の幅は変わりません** —— 47 件の最長は 4 文字で、
 * 残す中の神奈川県が同じ 4 文字だからです。
 *
 * 契約は件数もコード体系も宣言していないため、生成器には本物を出す手がかりがありません。
 * ここに書いた値が実データと一致していることの保証はこの宣言だけで、**出所はバックエンドでは
 * ありません**。
 */
const PREFECTURES = [
  { code: 1, name: "北海道" },
  { code: 4, name: "宮城県" },
  { code: 13, name: "東京都" },
  { code: 14, name: "神奈川県" },
  { code: 23, name: "愛知県" },
  { code: 26, name: "京都府" },
  { code: 27, name: "大阪府" },
  { code: 34, name: "広島県" },
  { code: 38, name: "愛媛県" },
  { code: 40, name: "福岡県" },
  { code: 47, name: "沖縄県" },
].map(({ code, name }) => ({
  id: `0195f0c2-0000-7000-8000-${String(code).padStart(12, "0")}`,
  code,
  name,
}));

const apiInput = {
  target: "./openapi/api.gen.yaml",
  filters: { mode: "exclude" as const, tags: NON_CLIENT_TAGS },
};

export default defineConfig({
  // wire 型は src/adapters/gen/ に、HTTP client は mocks/ に置く。orval は client の出力先
  // (target) を必須とする一方、outbound の resilience は adapters の手書き wrapper が所有する
  // ([0071](docs/adr/0071-bff-api-integration.md))ため、生成された client は使わない。
  // 本番が参照する場所へ置くと「どちらで呼ぶのか」が生成物の側から曖昧になる。
  // 孤児の始末は orval の clean ではなく `make gen-api` が持つ。あちらは生成の直前に置き場を
  // まるごと消すので、mode や target の置き方に依らず「契約に無いものは残らない」が成り立つ。
  // project ごとの clean だと、単一ファイルへ出す zod 側には付けられない —— その target の
  // ディレクトリが契約ごとの共有階層 (`src/adapters/gen/<契約名>/`) で、同階層の model/ ごと
  // 消してしまうためである。置き場の都合が出力の形を縛らないよう、責任を 1 段外へ出してある。
  api: {
    input: apiInput,
    output: {
      client: "fetch",
      mode: "split",
      target: "./mocks/api/endpoints.ts",
      schemas: "./src/adapters/gen/api/model",
      mock: { generators: [{ type: "msw" }] },
      override: {
        mock: { properties: PATTERNED_MOCK_PROPERTIES },
        operations: {
          GetPrefectures: { mock: { data: PREFECTURES } },
          // 売上額は decimal 文字列だが、同じ項目名がダッシュボードの集計では整数で宣言されて
          // いる。項目名で指定すると整数のほうまで文字列に変わるため、この operation に閉じる。
          GetProductsRankingAmount: {
            mock: { properties: { "/^salesAmount$/": () => "824.69" } },
          },
        },
      },
    },
  },
  apiZod: {
    input: apiInput,
    output: {
      client: "zod",
      mode: "single",
      target: "./src/adapters/gen/api/endpoints.zod.ts",
    },
  },
});

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

const apiInput = {
  target: "./openapi/api.gen.yaml",
  filters: { mode: "exclude" as const, tags: NON_CLIENT_TAGS },
};

const authInput = {
  target: "./openapi/auth.gen.yaml",
  filters: { mode: "exclude" as const, tags: ["health"] },
};

export default defineConfig({
  // wire 型は src/adapters/gen/ に、HTTP client は mocks/ に置く。orval は client の出力先
  // (target) を必須とする一方、outbound の resilience は adapters の手書き wrapper が所有する
  // ([0071](docs/adr/0071-bff-api-integration.md))ため、生成された client は使わない。
  // 本番が参照する場所へ置くと「どちらで呼ぶのか」が生成物の側から曖昧になる。
  api: {
    input: apiInput,
    output: {
      client: "fetch",
      mode: "split",
      target: "./mocks/api/endpoints.ts",
      schemas: "./src/adapters/gen/api/model",
      mock: { generators: [{ type: "msw" }] },
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
  // mock OIDC Provider の契約。MSW ハンドラは生成しない。認証の配線は P5-4 が持ち、
  // 使う当てのないハンドラを先に置かない。
  auth: {
    input: authInput,
    output: {
      client: "fetch",
      mode: "split",
      target: "./mocks/auth/endpoints.ts",
      schemas: "./src/adapters/gen/auth/model",
    },
  },
  authZod: {
    input: authInput,
    output: {
      client: "zod",
      mode: "single",
      target: "./src/adapters/gen/auth/endpoints.zod.ts",
    },
  },
});

import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import { PURCHASE_STATUS } from "@/model/purchase/purchase-status";
import * as zodSchemas from "../src/adapters/gen/api/endpoints.zod";
import * as apiMocks from "./api/endpoints.msw";

// 生成物どうしの対応は名前で決まる。`getGetProductsResponseMock` の応答は
// `GetProductsResponse` が検証する。
const MOCK_PREFIX = "get";
const MOCK_SUFFIX = "Mock";

// nullable な項目は `faker.helpers.arrayElement([値, null])` で生成される。1 回だけ実行すると
// null を引いた回だけ検査が通ってしまうため、seed を固定して複数回まわす。
const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34];

function toSchemaName(mockName: string): string {
  return mockName.slice(MOCK_PREFIX.length, -MOCK_SUFFIX.length);
}

function isResponseMock(name: string): boolean {
  return name.startsWith(MOCK_PREFIX) && name.endsWith(`Response${MOCK_SUFFIX}`);
}

const pairs = Object.entries(apiMocks)
  .filter(([name, value]) => isResponseMock(name) && typeof value === "function")
  .map(([name, factory]) => ({
    name,
    factory,
    schema: Object.entries(zodSchemas).find(
      ([schemaName]) => schemaName === toSchemaName(name),
    )?.[1],
  }));

describe("契約駆動モック", () => {
  // ----- 正常系 -----
  it("応答を返すハンドラをすべて突合の対象にする", () => {
    expect(pairs.length).toBeGreaterThan(0);
  });

  it.each(pairs)("$name の応答が契約を満たす", ({ factory, schema }) => {
    // 対応する zod が無いのは、生成物どうしの命名が食い違った状態であり検知したい変化。
    expect(schema).toBeDefined();

    const issues = SEEDS.flatMap((seed) => {
      faker.seed(seed);

      const parsed = (schema as ZodType).safeParse((factory as () => unknown)());

      return parsed.success ? [] : parsed.error.issues;
    });

    expect(issues).toEqual([]);
  });

  // 口をまたいで指し合う項目のうち、**生成器の側で揃えているもの**をここで押さえる。表
  // （`references.ts`）が採り直すのは応答を組んだ後で、生成器の宣言どうしが食い違っていることは
  // そこでは分からない。県名は選択部品の選択肢そのものなので、外れると利用者が触っていないのに
  // 検証エラーが出る。
  it("郵便番号の補完が返す県名は、都道府県マスタが並べる綴りの中にある", () => {
    const offered = new Set(
      (apiMocks.getGetPrefecturesResponseMock() as readonly { name: string }[]).map(
        ({ name }) => name,
      ),
    );
    const returned = SEEDS.flatMap((seed) => {
      faker.seed(seed);

      const response = apiMocks.getGetAddressesResponseMock() as {
        candidates: readonly { prefectureName: string }[];
      };

      return response.candidates.map(({ prefectureName }) => prefectureName);
    });

    expect(returned.length).toBeGreaterThan(0);
    expect(returned.filter((name) => !offered.has(name))).toEqual([]);
  });

  it("購入ステータスマスタが並べる業務キーは、アプリの転記と一致する", () => {
    // 契約は値域を宣言しないため宣言が 2 つある（`orval.config.ts` とアプリ側の転記）。片方だけ
    // 動くと、バッジの色も詳細に出せる操作も黙って既定へ倒れる。
    const offered = (
      apiMocks.getGetPurchaseStatusesResponseMock() as readonly { code: number }[]
    ).map(({ code }) => code);

    expect(offered.toSorted((left, right) => left - right)).toEqual(
      Object.values(PURCHASE_STATUS).toSorted((left, right) => left - right),
    );
  });
});

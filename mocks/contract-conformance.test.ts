import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import * as zodSchemas from "../src/adapters/gen/api/endpoints.zod";
import * as apiMocks from "./api/endpoints.msw";

// 生成物どうしの対応は名前で決まる。`getGetProductsResponseMock` の応答は
// `GetProductsResponse` が検証する。
const MOCK_PREFIX = "get";
const MOCK_SUFFIX = "Mock";

// 契約側の名前衝突で、生成器の項目指定では直せないもの。
//
// 為替レスポンス直下の `amount` は pattern 付きの decimal 文字列だが、同じ応答に入れ子で
// 含まれる参考換算額の `amount` は最小単位の整数である。生成器が項目を選べるのは名前とパス
// だけで、入れ子側は独立したスキーマとして生成されパスも `#.amount` になるため、両者を
// 指し分けられない。購入集計の金額（整数側）を正しく保つ方を採っている。
//
// 撤去条件: 上流で参考換算額の項目が改名されること（go-boilerplate #987）。
const KNOWN_UNCONFORMING = new Set(["getGetExchangeRatesResponseMock"]);

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

const targets = pairs.filter(({ name }) => !KNOWN_UNCONFORMING.has(name));

describe("正常系", () => {
  describe("契約駆動モック", () => {
    it("応答を返すハンドラをすべて突合の対象にする", () => {
      expect(targets.length).toBeGreaterThan(0);
    });
    it.each(targets)("$name の応答が契約を満たす", ({ factory, schema }) => {
      // 対応する zod が無いのは、生成物どうしの命名が食い違った状態であり検知したい変化。
      expect(schema).toBeDefined();

      const issues = SEEDS.flatMap((seed) => {
        faker.seed(seed);

        const parsed = (schema as ZodType).safeParse((factory as () => unknown)());

        return parsed.success ? [] : parsed.error.issues;
      });

      expect(issues).toEqual([]);
    });
  });
});

describe("異常系", () => {
  describe("契約駆動モック", () => {
    it.each([...KNOWN_UNCONFORMING])("%s は既知の未適合として除外されている", (name) => {
      // 除外したまま上流が直っても気づけないと、除外が恒久化する。対象が消えたら失敗させる。
      expect(pairs.some((pair) => pair.name === name)).toBe(true);
    });
  });
});

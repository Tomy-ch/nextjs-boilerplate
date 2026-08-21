import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getProductCategories } from "./product-masters";

describe("getProductCategories", () => {
  // ----- 正常系 -----
  it("生成ハンドラが返した全件を落とさずに受け取る", async () => {
    const categories = await getProductCategories();

    // 件数を名指しできるのは、生成ハンドラの応答が要求ごとに再現するため
    // （`mocks/stable-responses.ts`）。件数を見ない形だと、写しが途中で 1 件に畳んでも通る。
    expect(categories).toHaveLength(4);
  });

  it("生成ハンドラの応答から表示に使う項目だけを残す", async () => {
    const [category] = await getProductCategories();

    expect(category).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      code: expect.any(Number),
      name: expect.any(String),
    });
  });
});

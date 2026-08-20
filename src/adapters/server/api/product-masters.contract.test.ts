import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { getProductCategories } from "./product-masters";

describe("getProductCategories", () => {
  // ----- 正常系 -----
  it("契約から生成したハンドラの応答を検証して受け取る", async () => {
    const categories = await getProductCategories();

    expect(categories.length).toBeGreaterThan(0);
  });

  it("生成ハンドラの応答から表示に使う項目だけを残す", async () => {
    const [category] = await getProductCategories();

    expect(category).toEqual({
      id: expect.any(String),
      code: expect.any(Number),
      name: expect.any(String),
    });
  });
});

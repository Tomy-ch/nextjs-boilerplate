import { describe, expect, it } from "vitest";

import { controlIdOf, findFirstInvalidSection, validatedFieldsOf } from "./form-sections";
import type { ProductValidatedField } from "./product-rules";

const VALIDATED = [
  "name",
  "price",
  "quantity",
  "stockWarningThreshold",
  "categoryId",
  "statusId",
  "publishedAt",
] as const satisfies readonly ProductValidatedField[];

describe("validatedFieldsOf", () => {
  // ----- 正常系 -----
  it("その段に属する項目だけを返す", () => {
    expect(validatedFieldsOf("publish", VALIDATED)).toEqual(["statusId", "publishedAt"]);
  });

  it("渡された並びの順序を保つ", () => {
    expect(validatedFieldsOf("basics", VALIDATED)).toEqual([
      "name",
      "price",
      "quantity",
      "stockWarningThreshold",
      "categoryId",
    ]);
  });

  it("判定を持つ項目が無い段では空になる", () => {
    expect(validatedFieldsOf("images", VALIDATED)).toEqual([]);
  });

  it("渡されなかった項目は返さない。在庫数を尋ねない画面のため", () => {
    const withoutQuantity = VALIDATED.filter((field) => field !== "quantity");

    expect(validatedFieldsOf("basics", withoutQuantity)).not.toContain("quantity");
  });
});

describe("findFirstInvalidSection", () => {
  // ----- 正常系 -----
  it("誤りのある項目が属する段を返す", () => {
    expect(findFirstInvalidSection({ statusId: ["状態を選んでください。"] })).toBe("publish");
  });

  it("誤りが複数あれば、入力欄が並ぶ順で最初の段を返す", () => {
    const section = findFirstInvalidSection({
      statusId: ["状態を選んでください。"],
      price: ["価格を入力してください。"],
    });

    expect(section).toBe("basics");
  });

  it("誤りが無ければ段を返さない", () => {
    expect(findFirstInvalidSection({})).toBeUndefined();
  });

  // ----- 異常系 -----
  it("項目ごとの誤りそのものが無ければ段を返さない", () => {
    expect(findFirstInvalidSection(undefined)).toBeUndefined();
  });
});

describe("controlIdOf", () => {
  // ----- 正常系 -----
  it("前置きと項目から、入力欄の id を組む", () => {
    expect(controlIdOf("form", "name")).toBe("form-name");
  });

  it("項目の綴りと id の綴りは別の規則に従う", () => {
    // 送信名は契約の綴り、id は kebab-case。導出を 1 か所に置くのは、両者が別々に動くため。
    expect(controlIdOf("form", "stockWarningThreshold")).toBe("form-stock-warning-threshold");
  });

  it("同じ項目でも前置きが違えば別の id になる。1 つの文書へ 2 度置いても衝突しない", () => {
    expect(controlIdOf("a", "price")).not.toBe(controlIdOf("b", "price"));
  });
});

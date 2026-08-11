import { describe, expect, it } from "vitest";

import { toPascalCase, validateName } from "./naming";

describe("validateName", () => {
  // ----- 正常系 -----
  it("1 語の kebab-case を受け付ける", () => {
    expect(validateName("products")).toBeNull();
  });

  it("ハイフン区切りの kebab-case を受け付ける", () => {
    expect(validateName("product-detail-header")).toBeNull();
  });

  it("語中の数字を受け付ける", () => {
    expect(validateName("step2-form")).toBeNull();
  });

  // ----- 異常系 -----
  it("空文字は、指定が要ることを述べて拒む", () => {
    expect(validateName("")).toBe(
      "名前が空です。kebab-case で指定してください（例: product-detail）。",
    );
  });

  it("大文字混じりを拒む", () => {
    expect(validateName("ProductDetail")).toContain("kebab-case ではありません");
  });

  it("数字始まりを拒む", () => {
    expect(validateName("2-step")).toContain("kebab-case ではありません");
  });

  it("ハイフンの連続を拒む", () => {
    expect(validateName("product--detail")).toContain("kebab-case ではありません");
  });

  it("末尾のハイフンを拒む", () => {
    expect(validateName("product-")).toContain("kebab-case ではありません");
  });
});

describe("toPascalCase", () => {
  // ----- 正常系 -----
  it("1 語の先頭を大文字にする", () => {
    expect(toPascalCase("products")).toBe("Products");
  });

  it("ハイフン区切りを語ごとに大文字化して連結する", () => {
    expect(toPascalCase("product-detail-header")).toBe("ProductDetailHeader");
  });

  it("数字を含む語も語頭だけを大文字にする", () => {
    expect(toPascalCase("step2-form")).toBe("Step2Form");
  });
});

import { describe, expect, it } from "vitest";

import { toPascalCase, validateName } from "./naming";

describe("validateName", () => {
  // ----- 正常系 -----
  it("1 語の kebab-case を受け付ける", () => {
    expect(validateName("reports")).toBeNull();
  });

  it("ハイフン区切りの kebab-case を受け付ける", () => {
    expect(validateName("report-detail-header")).toBeNull();
  });

  it("語中の数字を受け付ける", () => {
    expect(validateName("step2-form")).toBeNull();
  });

  // ----- 異常系 -----
  it("空文字は、指定が要ることを述べて拒む", () => {
    expect(validateName("")).toBe(
      "名前が空です。kebab-case で指定してください（例: report-detail）。",
    );
  });

  it("大文字混じりを拒む", () => {
    expect(validateName("ReportDetail")).toContain("kebab-case ではありません");
  });

  it("数字始まりを拒む", () => {
    expect(validateName("2-step")).toContain("kebab-case ではありません");
  });

  it("ハイフンの連続を拒む", () => {
    expect(validateName("report--detail")).toContain("kebab-case ではありません");
  });

  it("末尾のハイフンを拒む", () => {
    expect(validateName("report-")).toContain("kebab-case ではありません");
  });
});

describe("toPascalCase", () => {
  // ----- 正常系 -----
  it("1 語の先頭を大文字にする", () => {
    expect(toPascalCase("reports")).toBe("Reports");
  });

  it("ハイフン区切りを語ごとに大文字化して連結する", () => {
    expect(toPascalCase("report-detail-header")).toBe("ReportDetailHeader");
  });

  it("数字を含む語も語頭だけを大文字にする", () => {
    expect(toPascalCase("step2-form")).toBe("Step2Form");
  });
});

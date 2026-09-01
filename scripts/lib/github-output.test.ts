import { describe, expect, it } from "vitest";

import { formatOutputLines } from "./github-output";

describe("formatOutputLines", () => {
  // ----- 正常系 -----
  it("行ごとに改行を添えて 1 つの文字列にする", () => {
    expect(formatOutputLines(["status=OK", "count=3"])).toBe("status=OK\ncount=3\n");
  });

  it("行が 1 つも無ければ空にする", () => {
    expect(formatOutputLines([])).toBe("");
  });

  it("値が空でもそのまま書く", () => {
    expect(formatOutputLines(["subject="])).toBe("subject=\n");
  });

  // ----- 異常系 -----
  it("改行を含む値は、均さずにその場で断る", () => {
    expect(() => formatOutputLines(["status=OK\ninjected=true"])).toThrow(
      "出力へ改行を含む値が渡されました: status=OK",
    );
  });

  it("復帰も行の区切りとして扱う", () => {
    expect(() => formatOutputLines(["status=OK\rinjected=true"])).toThrow(
      "出力へ改行を含む値が渡されました",
    );
  });

  it("並びの途中の 1 行でも断る", () => {
    expect(() => formatOutputLines(["count=3", "status=OK\ninjected=true"])).toThrow(
      "出力へ改行を含む値が渡されました",
    );
  });
});

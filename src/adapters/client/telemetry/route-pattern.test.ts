import { describe, expect, it } from "vitest";

import { toRoutePattern } from "./route-pattern";

describe("toRoutePattern", () => {
  // ----- 正常系 -----
  it("動的セグメントを持たないパスをそのまま返す", () => {
    expect(toRoutePattern("/docs", {})).toBe("/docs");
  });

  it("動的セグメントの値を名前へ戻す", () => {
    expect(toRoutePattern("/docs/42", { id: "42" })).toBe("/docs/[id]");
  });

  it("動的セグメントが複数あるとき、すべて名前へ戻す", () => {
    expect(toRoutePattern("/teams/7/docs/42", { teamId: "7", id: "42" })).toBe(
      "/teams/[teamId]/docs/[id]",
    );
  });

  it("catch-all の値をまとめて 1 つの名前へ戻す", () => {
    expect(toRoutePattern("/docs/adr/0082/body", { slug: ["adr", "0082", "body"] })).toBe(
      "/docs/[...slug]",
    );
  });

  it("符号化されたパスでも名前へ戻す", () => {
    expect(toRoutePattern("/docs/%E8%A8%98%E4%BA%8B", { id: "記事" })).toBe("/docs/[id]");
  });

  it("catch-all のセグメントが符号化されていても名前へ戻す", () => {
    expect(toRoutePattern("/docs/%E8%A8%AD%E8%A8%88/adr", { slug: ["設計", "adr"] })).toBe(
      "/docs/[...slug]",
    );
  });

  it("末尾のセグメントが続くパスでも、値の位置だけを名前へ戻す", () => {
    expect(toRoutePattern("/docs/42/edit", { id: "42" })).toBe("/docs/[id]/edit");
  });

  it("値の無いセグメントを名前へ戻さない", () => {
    expect(toRoutePattern("/docs", { id: undefined })).toBe("/docs");
  });

  it("空の値を名前へ戻さない", () => {
    expect(toRoutePattern("/docs", { id: "" })).toBe("/docs");
    expect(toRoutePattern("/docs", { slug: [] })).toBe("/docs");
  });

  // ----- 異常系 -----
  it("パスに現れない値では何も置き換えない", () => {
    expect(toRoutePattern("/docs/42", { id: "99" })).toBe("/docs/42");
  });

  it("上限を超えたパスを切り詰める", () => {
    const pathname = `/${"a".repeat(300)}`;

    expect(toRoutePattern(pathname, {})).toHaveLength(200);
  });
});

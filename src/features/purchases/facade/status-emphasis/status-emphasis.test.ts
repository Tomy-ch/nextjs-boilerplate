import { describe, expect, it } from "vitest";

import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";

import { toStatusEmphasis } from "./status-emphasis";

describe("toStatusEmphasis", () => {
  // ----- 正常系 -----
  it("完了は望ましい終端として示す", () => {
    expect(toStatusEmphasis("完了")).toBe(BADGE_VARIANT.SUCCESS);
  });

  it("配達済みも望ましい終端として示す", () => {
    expect(toStatusEmphasis("配達済み")).toBe(BADGE_VARIANT.SUCCESS);
  });

  it("キャンセルは取り消しとして示す", () => {
    expect(toStatusEmphasis("キャンセル")).toBe(BADGE_VARIANT.DESTRUCTIVE);
  });

  it("まだ動いている状態には色を付けない", () => {
    expect(toStatusEmphasis("発送済み")).toBe(BADGE_VARIANT.SECONDARY);
    expect(toStatusEmphasis("支払い済み")).toBe(BADGE_VARIANT.SECONDARY);
  });

  // ----- 異常系 -----
  it("知らない名称は進行中へ倒す", () => {
    expect(toStatusEmphasis("未知のステータス")).toBe(BADGE_VARIANT.SECONDARY);
  });

  it("名称が空でも終端として扱わない", () => {
    expect(toStatusEmphasis("")).toBe(BADGE_VARIANT.SECONDARY);
  });
});

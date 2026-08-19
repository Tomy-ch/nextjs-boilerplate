import { describe, expect, it } from "vitest";

import { BADGE_VARIANT } from "@/components/design-system/display/badge/badge.definition";

import { toStatusTone } from "./status-tone";

describe("toStatusTone", () => {
  // ----- 正常系 -----
  it.each([
    { code: 1, name: "在庫あり" },
    { code: 10, name: "限定販売" },
  ])("渡せる状態（$name）は目立たせない", ({ code }) => {
    expect(toStatusTone(code)).toBe(BADGE_VARIANT.SECONDARY);
  });

  it.each([
    { code: 3, name: "予約受付中" },
    { code: 5, name: "取り寄せ中" },
    { code: 6, name: "入荷待ち" },
    { code: 9, name: "再入荷予定" },
  ])("待ちがある状態（$name）は注意として出す", ({ code }) => {
    expect(toStatusTone(code)).toBe(BADGE_VARIANT.WARNING);
  });

  it("売れない状態は最も強く出す", () => {
    expect(toStatusTone(2)).toBe(BADGE_VARIANT.DESTRUCTIVE);
  });

  it.each([
    { code: 4, name: "販売終了" },
    { code: 7, name: "廃盤" },
    { code: 8, name: "検討中" },
  ])("役目を終えた状態（$name）は沈める", ({ code }) => {
    expect(toStatusTone(code)).toBe(BADGE_VARIANT.GHOST);
  });

  // ----- 異常系 -----
  it("マスタに無いコードは既存のどの区分にも寄せない", () => {
    expect(toStatusTone(99)).toBe(BADGE_VARIANT.OUTLINE);
  });

  it("コードが引けなかったときも既定へ倒す", () => {
    expect(toStatusTone(undefined)).toBe(BADGE_VARIANT.OUTLINE);
  });
});

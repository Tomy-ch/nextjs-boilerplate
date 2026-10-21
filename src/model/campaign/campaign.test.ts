import { describe, expect, it } from "vitest";

import { toCampaignId } from "./campaign";

const RAW_ID = "0193a1c0-0002-7000-8000-000000000003";

describe("toCampaignId", () => {
  it("受け取った文字列をそのまま識別子として返す", () => {
    expect(toCampaignId(RAW_ID)).toBe(RAW_ID);
  });

  it("実在するかは検査しない。確定させるのは識別子の種類だけ", () => {
    expect(toCampaignId("まだ存在しない")).toBe("まだ存在しない");
  });
});

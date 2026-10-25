import { describe, expect, it } from "vitest";

import { CAMPAIGN_PAGE_MAX } from "@/adapters/server/api/campaigns";

import { toAdminCampaignListLocation } from "./read-location";

const PAGE_MAX = CAMPAIGN_PAGE_MAX;

describe("toAdminCampaignListLocation", () => {
  // ----- 正常系 -----
  it("ページ番号を読む", () => {
    expect(toAdminCampaignListLocation({ page: "3" }, PAGE_MAX)).toEqual({ page: 3 });
  });

  it("ページ番号が無ければ、先頭ページとして読む", () => {
    expect(toAdminCampaignListLocation({}, PAGE_MAX)).toEqual({ page: 1 });
  });

  it("契約が受け付ける上限そのものは通す", () => {
    expect(toAdminCampaignListLocation({ page: String(PAGE_MAX) }, PAGE_MAX).page).toBe(PAGE_MAX);
  });

  // ----- 異常系 -----
  it("契約の上限を超えるページ番号は、先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: String(PAGE_MAX + 1) }, PAGE_MAX).page).toBe(1);
  });

  it("0 のページ番号は、先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: "0" }, PAGE_MAX).page).toBe(1);
  });

  it("負のページ番号は、先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: "-1" }, PAGE_MAX).page).toBe(1);
  });

  it("整数でないページ番号は、先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: "1.5" }, PAGE_MAX).page).toBe(1);
  });

  it("数として読めないページ番号は、先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: "abc" }, PAGE_MAX).page).toBe(1);
  });

  it("ページ番号が繰り返されていたら、どちらも採らず先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: ["2", "3"] }, PAGE_MAX).page).toBe(1);
  });

  it("空のページ番号は、先頭へ倒す", () => {
    expect(toAdminCampaignListLocation({ page: "" }, PAGE_MAX).page).toBe(1);
  });
});

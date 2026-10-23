import { describe, expect, it } from "vitest";

import { ADMIN_CAMPAIGN_LIST_PATH } from "../../paths";
import { CAMPAIGN_LIST_KEY, toCampaignListHref } from "./query";

describe("toCampaignListHref", () => {
  // ----- 正常系 -----
  it("先頭ページは、条件を載せない住所にする", () => {
    expect(toCampaignListHref({ page: 1 })).toBe(ADMIN_CAMPAIGN_LIST_PATH);
  });

  it("先頭を下回るページ番号も、条件を載せない住所にする", () => {
    expect(toCampaignListHref({ page: 0 })).toBe(ADMIN_CAMPAIGN_LIST_PATH);
  });

  it("2 ページ目からは、ページ番号を載せる", () => {
    expect(toCampaignListHref({ page: 2 })).toBe(
      `${ADMIN_CAMPAIGN_LIST_PATH}?${CAMPAIGN_LIST_KEY.PAGE}=2`,
    );
  });

  it("先頭から離れたページ番号を、そのまま載せる", () => {
    expect(toCampaignListHref({ page: 12 })).toBe(
      `${ADMIN_CAMPAIGN_LIST_PATH}?${CAMPAIGN_LIST_KEY.PAGE}=12`,
    );
  });
});

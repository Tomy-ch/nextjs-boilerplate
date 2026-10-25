// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ADMIN_CAMPAIGN_LIST_PATH } from "../../paths";
import { AdminCampaignCreateBreadcrumbContent } from "./breadcrumb-content";

describe("AdminCampaignCreateBreadcrumbContent", () => {
  it("一覧への戻り先を、キャンペーン一覧へ向ける", () => {
    render(<AdminCampaignCreateBreadcrumbContent />);

    expect(screen.getByRole("link", { name: "キャンペーン一覧" })).toHaveAttribute(
      "href",
      ADMIN_CAMPAIGN_LIST_PATH,
    );
  });

  it("新規作成を、戻り先を持たない現在地として出す", () => {
    render(<AdminCampaignCreateBreadcrumbContent />);

    expect(screen.getByText("新規作成")).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "新規作成" })).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<AdminCampaignCreateBreadcrumbContent />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

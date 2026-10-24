// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminCampaignListBreadcrumb from "./page";

describe("AdminCampaignListBreadcrumb", () => {
  it("一覧では、現在地までの階層を出さない", () => {
    const { container } = render(<AdminCampaignListBreadcrumb />);

    expect(container).toBeEmptyDOMElement();
  });
});

// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminAnalyticsBreadcrumb from "./page";

describe("AdminAnalyticsBreadcrumb", () => {
  it("期間を選んで集計を読む画面では、現在地までの階層を出さない", () => {
    const { container } = render(<AdminAnalyticsBreadcrumb />);

    expect(container).toBeEmptyDOMElement();
  });
});

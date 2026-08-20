// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminDashboardBreadcrumb from "./page";

describe("AdminDashboardBreadcrumb", () => {
  // ----- 正常系 -----
  it("管理の入口では、現在地までの階層を出さない", () => {
    const { container } = render(<AdminDashboardBreadcrumb />);

    expect(container).toBeEmptyDOMElement();
  });
});

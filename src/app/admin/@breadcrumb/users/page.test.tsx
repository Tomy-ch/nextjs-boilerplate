// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminUserListBreadcrumb from "./page";

describe("AdminUserListBreadcrumb", () => {
  it("一覧では、現在地までの階層を出さない", () => {
    const { container } = render(<AdminUserListBreadcrumb />);

    expect(container).toBeEmptyDOMElement();
  });
});

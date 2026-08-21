// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminProductListBreadcrumb from "./page";

describe("AdminProductListBreadcrumb", () => {
  it("一覧では、現在地までの階層を出さない", () => {
    const { container } = render(<AdminProductListBreadcrumb />);

    expect(container).toBeEmptyDOMElement();
  });
});

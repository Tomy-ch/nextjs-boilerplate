// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminBreadcrumbDefault from "./default";

describe("AdminBreadcrumbDefault", () => {
  it("階層の一番上にある画面では、現在地までの階層を出さない", () => {
    const { container } = render(<AdminBreadcrumbDefault />);

    expect(container).toBeEmptyDOMElement();
  });
});

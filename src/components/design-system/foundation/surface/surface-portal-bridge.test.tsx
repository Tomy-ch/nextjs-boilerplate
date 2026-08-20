// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SURFACE, SURFACE_ATTRIBUTE } from "./surface.definition";
import { SurfacePortalBridge } from "./surface-portal-bridge";

describe("SurfacePortalBridge", () => {
  it("Portal の出口へ系統を載せる", () => {
    render(<SurfacePortalBridge surface={SURFACE.ADMIN} />);

    expect(document.body.getAttribute(SURFACE_ATTRIBUTE)).toBe(SURFACE.ADMIN);
  });

  it("外れると出口から消す", () => {
    const { unmount } = render(<SurfacePortalBridge surface={SURFACE.ADMIN} />);

    unmount();

    expect(document.body.hasAttribute(SURFACE_ATTRIBUTE)).toBe(false);
  });

  it("別の書き手が置き直した値までは消さない", () => {
    const { unmount } = render(<SurfacePortalBridge surface={SURFACE.ADMIN} />);

    document.body.setAttribute(SURFACE_ATTRIBUTE, "other");
    unmount();

    expect(document.body.getAttribute(SURFACE_ATTRIBUTE)).toBe("other");
    document.body.removeAttribute(SURFACE_ATTRIBUTE);
  });

  it("描くものを持たない", () => {
    const { container } = render(<SurfacePortalBridge surface={SURFACE.ADMIN} />);

    expect(container).toBeEmptyDOMElement();
  });
});

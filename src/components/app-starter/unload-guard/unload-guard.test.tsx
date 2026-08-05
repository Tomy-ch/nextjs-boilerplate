// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UnloadGuard } from "./unload-guard";

function dispatchUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);

  return event.defaultPrevented;
}

describe("UnloadGuard", () => {
  it("何も描画しない", () => {
    const { container } = render(<UnloadGuard when />);

    expect(container).toBeEmptyDOMElement();
  });

  it("when が true のあいだは離脱を確認する", () => {
    render(<UnloadGuard when />);

    expect(dispatchUnload()).toBe(true);
  });

  it("when が false なら離脱を妨げない", () => {
    render(<UnloadGuard when={false} />);

    expect(dispatchUnload()).toBe(false);
  });

  it("when が false へ変わると確認を解除する", () => {
    const { rerender } = render(<UnloadGuard when />);
    expect(dispatchUnload()).toBe(true);

    rerender(<UnloadGuard when={false} />);

    expect(dispatchUnload()).toBe(false);
  });

  it("unmount 後は確認を残さない", () => {
    const { unmount } = render(<UnloadGuard when />);
    unmount();

    expect(dispatchUnload()).toBe(false);
  });
});

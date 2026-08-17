// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScrollDirection } from "./use-scroll-direction";

const { useScrollDirection } = vi.hoisted(() => ({
  useScrollDirection: vi.fn<() => ScrollDirection>(),
}));

vi.mock("./use-scroll-direction", () => ({ useScrollDirection }));

import { useDockVisibility } from "./use-dock-visibility";

/** 出しているかどうかと引き手だけを持つ部品。 */
function Probe() {
  const { shown, toggle } = useDockVisibility();

  return (
    <button type="button" onClick={toggle}>
      {shown ? "出ている" : "隠れている"}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useScrollDirection.mockReturnValue("up");
});

describe("useDockVisibility", () => {
  it("下へ読み進めているあいだ出す", () => {
    useScrollDirection.mockReturnValue("down");

    render(<Probe />);

    expect(screen.getByRole("button", { name: "出ている" })).toBeVisible();
  });

  it("上へ戻っているあいだは隠す", () => {
    render(<Probe />);

    expect(screen.getByRole("button", { name: "隠れている" })).toBeVisible();
  });

  it("引き手で開いたら、上へ戻っても出したままにする", async () => {
    const user = userEvent.setup();

    render(<Probe />);
    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button", { name: "出ている" })).toBeVisible();
  });

  it("開いた状態でもう一度押したら閉じる", async () => {
    const user = userEvent.setup();

    render(<Probe />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button", { name: "隠れている" })).toBeVisible();
  });
});

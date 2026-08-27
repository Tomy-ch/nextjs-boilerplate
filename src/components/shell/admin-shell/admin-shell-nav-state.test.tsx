// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AdminShellNavStateProvider, useAdminShellNav } from "./admin-shell-nav-state";

/** 供給の中身を画面から読めるようにする。 */
function Probe() {
  const { open, toggle } = useAdminShellNav();

  return (
    <button onClick={toggle} type="button">
      {open ? "開いている" : "畳んでいる"}
    </button>
  );
}

describe("useAdminShellNav", () => {
  // ----- 正常系 -----
  it("既定では開いている", () => {
    render(
      <AdminShellNavStateProvider>
        <Probe />
      </AdminShellNavStateProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("開いている");
  });

  it("切り替えると畳んだ状態になる", async () => {
    render(
      <AdminShellNavStateProvider>
        <Probe />
      </AdminShellNavStateProvider>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("畳んでいる");
  });

  it("もう一度切り替えると元へ戻る", async () => {
    render(
      <AdminShellNavStateProvider>
        <Probe />
      </AdminShellNavStateProvider>,
    );

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("開いている");
  });

  // ----- 異常系 -----
  it("供給の外で呼ぶと投げる", () => {
    expect(() => render(<Probe />)).toThrow(
      "AdminShellNavStateProvider の外で脇の一覧の開閉を読もうとしました",
    );
  });
});

describe("AdminShellNavStateProvider", () => {
  it("中身をそのまま描く", () => {
    render(
      <AdminShellNavStateProvider>
        <p>本文</p>
      </AdminShellNavStateProvider>,
    );

    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("開閉を外枠の属性として出す", async () => {
    const { container } = render(
      <AdminShellNavStateProvider>
        <Probe />
      </AdminShellNavStateProvider>,
    );
    const frame = container.firstElementChild;

    expect(frame).toHaveAttribute("data-nav-open", "true");

    await userEvent.click(screen.getByRole("button"));

    expect(frame).toHaveAttribute("data-nav-open", "false");
  });

  it("外枠へ class 名を渡せる", () => {
    const { container } = render(
      <AdminShellNavStateProvider className="flex">
        <p>本文</p>
      </AdminShellNavStateProvider>,
    );

    expect(container.firstElementChild).toHaveClass("flex");
  });
});

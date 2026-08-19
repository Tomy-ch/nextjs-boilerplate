// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminShellNavStateProvider } from "./admin-shell-nav-state";
import { AdminShellNavToggle } from "./admin-shell-nav-toggle";

function renderToggle() {
  return render(
    <AdminShellNavStateProvider>
      <AdminShellNavToggle />
    </AdminShellNavStateProvider>,
  );
}

function toggle(): HTMLElement {
  return screen.getByRole("button", { name: "メニューの開閉" });
}

describe("AdminShellNavToggle", () => {
  it("開いていることを状態として伝える", () => {
    renderToggle();

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("押すと畳んだ状態を伝える", async () => {
    renderToggle();

    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("押すたびに開閉が入れ替わる", async () => {
    renderToggle();

    await userEvent.click(toggle());
    await userEvent.click(toggle());

    expect(toggle()).toHaveAttribute("aria-expanded", "true");
  });

  it("記号だけの操作に読める名前を与える", () => {
    renderToggle();

    expect(toggle()).toHaveAccessibleName("メニューの開閉");
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderToggle();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

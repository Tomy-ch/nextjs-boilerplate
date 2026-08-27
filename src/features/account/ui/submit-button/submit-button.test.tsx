// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProfileSubmitButton } from "./submit-button";

const noop = () => {};

/** 応答が返らない送信。押している間の姿を留めるために使う。 */
const pendingForever = () => new Promise<void>(() => {});

function renderSubmit(action: () => void | Promise<void> = noop) {
  return render(
    <form action={action}>
      <ProfileSubmitButton label="登録する" pendingLabel="登録しています…" />
    </form>,
  );
}

describe("ProfileSubmitButton", () => {
  it("送信の操作として公開する", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "登録する" })).toHaveAttribute("type", "submit");
  });

  it("送信していないあいだは押せる", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  it("送信しているあいだは待っている旨の名前に替わり、押せなくなる", async () => {
    const user = userEvent.setup();

    renderSubmit(pendingForever);
    await user.click(screen.getByRole("button", { name: "登録する" }));

    const pending = await screen.findByRole("button", { name: "登録しています…" });

    expect(pending).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSubmit();

    expect((await axe(container)).violations).toEqual([]);
  });
});

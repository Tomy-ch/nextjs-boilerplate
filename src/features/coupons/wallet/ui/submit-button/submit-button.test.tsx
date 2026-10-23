// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ClaimSubmitButton } from "./submit-button";

const noop = () => {};

/** 応答が返らない送信。押している間の姿を留めるために使う。 */
const pendingForever = () => new Promise<void>(() => {});

function renderSubmit(action: () => void | Promise<void> = noop) {
  return render(
    <form action={action}>
      <ClaimSubmitButton />
    </form>,
  );
}

describe("ClaimSubmitButton", () => {
  it("送信の操作として公開する", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "受け取る" })).toHaveAttribute("type", "submit");
  });

  it("送信していないあいだは押せる", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "受け取る" })).toBeEnabled();
  });

  it("送信しているあいだは待っている旨の名前に替わり、押せなくなる", async () => {
    const user = userEvent.setup();

    renderSubmit(pendingForever);
    await user.click(screen.getByRole("button", { name: "受け取る" }));

    expect(await screen.findByRole("button", { name: "受け取っています" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSubmit();

    expect((await axe(container)).violations).toEqual([]);
  });
});

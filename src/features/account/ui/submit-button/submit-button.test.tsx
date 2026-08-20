// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProfileSubmitButton } from "./submit-button";

const noop = () => {};

function renderSubmit() {
  return render(
    <form action={noop}>
      <ProfileSubmitButton label="登録する" pendingLabel="登録しています…" />
    </form>,
  );
}

describe("ProfileSubmitButton", () => {
  // ----- 正常系 -----
  it("送信の操作として公開する", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "登録する" })).toHaveAttribute("type", "submit");
  });

  it("送信していないあいだは押せる", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSubmit();

    expect((await axe(container)).violations).toEqual([]);
  });
});

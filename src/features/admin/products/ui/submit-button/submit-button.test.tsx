// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ProductSubmitButton } from "./submit-button";

function renderSubmit(blocked = false) {
  return render(
    <form action={() => {}}>
      <ProductSubmitButton blocked={blocked} label="登録する" pendingLabel="登録しています…" />
    </form>,
  );
}

describe("ProductSubmitButton", () => {
  // ----- 正常系 -----
  it("送信の操作として公開する", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "登録する" })).toHaveAttribute("type", "submit");
  });

  it("止める理由が無ければ押せる", () => {
    renderSubmit();

    expect(screen.getByRole("button", { name: "登録する" })).toBeEnabled();
  });

  // ----- 異常系 -----
  it("止める理由があれば押せない", () => {
    renderSubmit(true);

    expect(screen.getByRole("button", { name: "登録する" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderSubmit();

    expect((await axe(container)).violations).toEqual([]);
  });
});

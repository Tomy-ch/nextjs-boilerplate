// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { STOCK_FORM_NAMES } from "../../form-names";
import { STOCK_DIRECTION } from "../../stock-direction";
import { StockAmountFields } from "./amount-fields";

function renderFields(message?: string) {
  return render(
    <StockAmountFields current={128} {...(message === undefined ? {} : { message })} />,
  );
}

describe("StockAmountFields", () => {
  it("補充が選ばれた状態で開く", () => {
    renderFields();

    expect(screen.getByRole("radio", { name: "補充する" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "差し引く" })).not.toBeChecked();
  });

  it("量が空のうちは見込みを出さない", () => {
    renderFields();

    expect(screen.queryByText(/送信後の見込み/)).not.toBeInTheDocument();
  });

  it("量を打つと、補充した後の見込みが出る", async () => {
    renderFields();

    await userEvent.type(screen.getByRole("spinbutton", { name: /数量/ }), "50");

    expect(screen.getByText("178")).toBeInTheDocument();
  });

  it("向きを差し引きへ変えると、同じ量でも見込みが引いた側へ動く", async () => {
    renderFields();

    await userEvent.type(screen.getByRole("spinbutton", { name: /数量/ }), "50");
    await userEvent.click(screen.getByRole("radio", { name: "差し引く" }));

    expect(screen.getByText("78")).toBeInTheDocument();
  });

  it("打った値は送信の項目名で載る", async () => {
    renderFields();

    await userEvent.type(screen.getByRole("spinbutton", { name: /数量/ }), "50");

    expect(screen.getByRole("spinbutton", { name: /数量/ })).toHaveAttribute(
      "name",
      STOCK_FORM_NAMES.quantity,
    );
    expect(screen.getByRole("radio", { name: "差し引く" })).toHaveAttribute(
      "value",
      STOCK_DIRECTION.DEDUCT,
    );
  });

  it("弾かれた文言を量の欄のそばに出す", () => {
    renderFields("1 以上の整数を入力してください。");

    expect(screen.getByText("1 以上の整数を入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /数量/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("弾かれていなければ、量の欄を誤りとして扱わない", () => {
    renderFields();

    expect(screen.getByRole("spinbutton", { name: /数量/ })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderFields();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

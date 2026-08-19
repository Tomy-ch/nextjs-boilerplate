// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import type { AdminProductListConditions } from "../../query";
import { AdminProductKeywordField } from "./keyword-field";

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCode: "",
  statusCode: "",
};

function renderField(conditions: AdminProductListConditions = NO_CONDITIONS) {
  return render(<AdminProductKeywordField conditions={conditions} />);
}

function input(): HTMLElement {
  return screen.getByRole("searchbox", { name: "商品名で探す" });
}

function submit(): HTMLElement {
  return screen.getByRole("button", { name: "検索" });
}

describe("AdminProductKeywordField", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("いま効いている検索語を入力欄に出す", () => {
    renderField({ ...NO_CONDITIONS, keyword: "イヤホン" });

    expect(input()).toHaveValue("イヤホン");
  });

  it("打鍵しただけでは検索しない", async () => {
    renderField();

    await userEvent.type(input(), "イヤホン");

    expect(push).not.toHaveBeenCalled();
  });

  it("送信すると一覧の URL へ移る", async () => {
    renderField();

    await userEvent.type(input(), "イヤホン");
    await userEvent.click(submit());

    expect(push).toHaveBeenCalledWith(
      "/admin/products?keyword=%E3%82%A4%E3%83%A4%E3%83%9B%E3%83%B3",
    );
  });

  it("前後の空白を落として送る", async () => {
    renderField();

    await userEvent.type(input(), "  鞄  ");
    await userEvent.click(submit());

    expect(push).toHaveBeenCalledWith("/admin/products?keyword=%E9%9E%84");
  });

  it("いま効いている他の条件を引き継ぐ", async () => {
    renderField({ ...NO_CONDITIONS, categoryCode: "1" });

    await userEvent.type(input(), "鞄");
    await userEvent.click(submit());

    expect(push).toHaveBeenCalledWith("/admin/products?keyword=%E9%9E%84&categoryCodes=1");
  });

  it("何も効いていない状態では空のまま送れない", () => {
    renderField();

    expect(submit()).toBeDisabled();
  });

  it("効いている検索語があれば空のまま送れる", () => {
    renderField({ ...NO_CONDITIONS, keyword: "鞄" });

    expect(submit()).toBeEnabled();
  });

  it("効いている検索語を消しても、外すために送れる", async () => {
    renderField({ ...NO_CONDITIONS, keyword: "鞄" });

    await userEvent.clear(input());

    expect(submit()).toBeEnabled();
  });

  it("入力を消したうえで何も効いていなければ送れない", async () => {
    renderField();

    await userEvent.type(input(), "鞄");
    await userEvent.clear(input());

    expect(submit()).toBeDisabled();
  });

  it("送信後、遷移の完了を待つ間の打鍵を巻き戻さない", async () => {
    const { rerender } = renderField();

    await userEvent.type(input(), "shoe");
    await userEvent.click(submit());
    await userEvent.type(input(), "s");
    rerender(<AdminProductKeywordField conditions={{ ...NO_CONDITIONS, keyword: "shoe" }} />);

    expect(input()).toHaveValue("shoes");
  });

  it("効いている検索語が外れたら入力欄も空になる", () => {
    const { rerender } = renderField({ ...NO_CONDITIONS, keyword: "鞄" });

    rerender(<AdminProductKeywordField conditions={NO_CONDITIONS} />);

    expect(input()).toHaveValue("");
  });

  it("a11y 検査を通る", async () => {
    const { container } = renderField();

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

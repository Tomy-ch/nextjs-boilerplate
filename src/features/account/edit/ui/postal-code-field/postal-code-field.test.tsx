// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { FieldRegistration } from "../../use-profile-fields";
import { PostalCodeField } from "./postal-code-field";

const CONTROL_ID = "profile-postalCode";
const ERROR_ID = "profile-postalCode-error";

/** `useAddressField` が組む配線の最小形。 */
function registrationOf(overrides: Partial<FieldRegistration> = {}): FieldRegistration {
  return {
    name: "postalCode",
    onBlur: vi.fn(async () => {}),
    onChange: vi.fn(async () => {}),
    onFocus: vi.fn(),
    ref: vi.fn(),
    ...overrides,
  };
}

function renderField(overrides: Partial<Parameters<typeof PostalCodeField>[0]> = {}) {
  return render(
    <PostalCodeField
      controlId={CONTROL_ID}
      errorId={ERROR_ID}
      message={undefined}
      onSearch={vi.fn()}
      registration={registrationOf()}
      required
      searching={false}
      {...overrides}
    />,
  );
}

describe("PostalCodeField", () => {
  it("項目の名前で入力欄を引けるようにする", () => {
    renderField();

    expect(screen.getByLabelText("郵便番号")).toBeVisible();
  });

  it("必須であることを入力欄の属性で支援技術へ伝える", () => {
    renderField();

    expect(screen.getByLabelText("郵便番号")).toHaveAttribute("aria-required", "true");
  });

  it("誤りが無いとき入力欄を不正にしない", () => {
    renderField();

    expect(screen.getByLabelText("郵便番号")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("郵便番号")).not.toHaveAttribute("aria-describedby");
  });

  it("誤りがあるとき入力欄を不正にし、文言を指させる", () => {
    renderField({ message: "郵便番号を入力してください。" });

    expect(screen.getByLabelText("郵便番号")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("郵便番号")).toHaveAttribute("aria-describedby", ERROR_ID);
    expect(screen.getByRole("alert")).toHaveAttribute("id", ERROR_ID);
  });

  it("数字の入力に向いた種類を入力欄へ与える", () => {
    renderField();

    expect(screen.getByLabelText("郵便番号")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("郵便番号")).toHaveAttribute("autocomplete", "postal-code");
  });

  it("検索の操作を入力欄と同じ枠の中に置く", () => {
    renderField();

    const search = screen.getByRole("button", { name: "住所を検索" });

    expect(search.closest("[data-slot=input-group]")).toContainElement(
      screen.getByLabelText("郵便番号"),
    );
  });

  it("検索の操作を押すと呼び出し側へ通す", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();

    renderField({ onSearch });
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(onSearch).toHaveBeenCalledOnce();
  });

  it("取得の最中は検索の操作を押せなくする", () => {
    renderField({ searching: true });

    expect(screen.getByRole("button", { name: "住所を検索" })).toBeDisabled();
  });

  it("検索の操作を form の送信にしない", () => {
    renderField();

    expect(screen.getByRole("button", { name: "住所を検索" })).toHaveAttribute("type", "button");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({ message: "郵便番号を入力してください。" });

    expect((await axe(container)).violations).toEqual([]);
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import type { FieldRegistration } from "../../use-profile-fields";
import { TextField } from "./text-field";

const CONTROL_ID = "profile-lastName";
const ERROR_ID = "profile-lastName-error";

/** `useProfileFields` が組む配線の最小形。 */
function registrationOf(overrides: Partial<FieldRegistration> = {}): FieldRegistration {
  return {
    name: "lastName",
    onBlur: vi.fn(async () => {}),
    onChange: vi.fn(async () => {}),
    onFocus: vi.fn(),
    ref: vi.fn(),
    ...overrides,
  };
}

function renderField(overrides: Partial<Parameters<typeof TextField>[0]> = {}) {
  return render(
    <TextField
      controlId={CONTROL_ID}
      errorId={ERROR_ID}
      label="姓"
      message={undefined}
      registration={registrationOf()}
      required
      {...overrides}
    />,
  );
}

describe("TextField", () => {
  it("項目の名前で入力欄を引けるようにする", () => {
    renderField();

    expect(screen.getByLabelText("姓")).toBeVisible();
  });

  it("必須であることを入力欄の属性で支援技術へ伝える", () => {
    renderField();

    expect(screen.getByLabelText("姓")).toHaveAttribute("aria-required", "true");
  });

  it("任意の項目には必須の属性を立てない", () => {
    renderField({ label: "建物名", required: false });

    expect(screen.getByLabelText("建物名")).toHaveAttribute("aria-required", "false");
  });

  it("誤りが無いとき入力欄を不正にしない", () => {
    renderField();

    expect(screen.getByLabelText("姓")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("姓")).not.toHaveAttribute("aria-describedby");
  });

  it("誤りがあるとき入力欄を不正にし、文言を指させる", () => {
    renderField({ message: "姓を入力してください。" });

    expect(screen.getByLabelText("姓")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("姓")).toHaveAttribute("aria-describedby", ERROR_ID);
    expect(screen.getByRole("alert")).toHaveAttribute("id", ERROR_ID);
  });

  it("入力の種類を示す属性をそのまま入力欄へ渡す", () => {
    renderField({ autoComplete: "tel", inputMode: "tel", label: "電話番号", type: "tel" });

    expect(screen.getByLabelText("電話番号")).toHaveAttribute("type", "tel");
    expect(screen.getByLabelText("電話番号")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("電話番号")).toHaveAttribute("autocomplete", "tel");
  });

  it("配線した focus と blur を入力欄へ届ける", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn(async () => {});
    const onFocus = vi.fn();

    renderField({ registration: registrationOf({ onBlur, onFocus }) });
    await user.click(screen.getByLabelText("姓"));
    await user.tab();

    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
  });

  it("必須の印を項目の名前へ混ぜない", () => {
    renderField();

    expect(screen.getByLabelText("姓")).toHaveAccessibleName("姓");
    expect(screen.getByText("必須")).toHaveAttribute("aria-hidden", "true");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({ message: "姓を入力してください。" });

    expect((await axe(container)).violations).toEqual([]);
  });
});

// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { PREFECTURES } from "../../account.fixture";
import type { FieldRegistration } from "../../use-profile-fields";
import { PrefectureField } from "./prefecture-field";

const CONTROL_ID = "profile-prefecture";
const ERROR_ID = "profile-prefecture-error";

/** `useProfileFields` が組む配線の最小形。 */
function registrationOf(overrides: Partial<FieldRegistration> = {}): FieldRegistration {
  return {
    name: "prefecture",
    onBlur: vi.fn(async () => {}),
    onChange: vi.fn(async () => {}),
    onFocus: vi.fn(),
    ref: vi.fn(),
    ...overrides,
  };
}

function renderField(overrides: Partial<Parameters<typeof PrefectureField>[0]> = {}) {
  return render(
    <PrefectureField
      controlId={CONTROL_ID}
      message={undefined}
      prefectures={PREFECTURES}
      registration={registrationOf()}
      required
      {...overrides}
    />,
  );
}

describe("PrefectureField", () => {
  it("項目の名前で入力欄を引けるようにする", () => {
    renderField();

    expect(screen.getByLabelText("都道府県")).toBeVisible();
  });

  it("受け取ったマスタをそのまま選択肢にする", () => {
    renderField();

    expect(
      within(screen.getByLabelText("都道府県"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(PREFECTURES.map(({ name }) => name));
  });

  it("選んだ値を都道府県名にする", () => {
    renderField();

    const [first] = within(screen.getByLabelText("都道府県")).getAllByRole("option");

    expect(first).toHaveValue(PREFECTURES[0]?.name);
  });

  it("検索つきの client island にせず、native の選択にする", () => {
    renderField();

    expect(screen.getByLabelText("都道府県").tagName).toBe("SELECT");
  });

  it("必須であることを入力欄の属性で支援技術へ伝える", () => {
    renderField();

    expect(screen.getByLabelText("都道府県")).toHaveAttribute("aria-required", "true");
  });

  it("誤りが無いとき入力欄を不正にしない", () => {
    renderField();

    expect(screen.getByLabelText("都道府県")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("都道府県")).not.toHaveAttribute("aria-describedby");
  });

  it("誤りがあるとき入力欄を不正にし、文言を指させる", () => {
    renderField({ message: "都道府県を選択してください。" });

    expect(screen.getByLabelText("都道府県")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("都道府県")).toHaveAttribute("aria-describedby", ERROR_ID);
    expect(screen.getByRole("alert")).toHaveAttribute("id", ERROR_ID);
  });

  it("住所の自動入力に対応する種類を入力欄へ与える", () => {
    renderField();

    expect(screen.getByLabelText("都道府県")).toHaveAttribute("autocomplete", "address-level1");
  });

  it("選ぶと配線した onChange へ通す", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(async () => {});

    renderField({ registration: registrationOf({ onChange }) });
    await user.selectOptions(screen.getByLabelText("都道府県"), String(PREFECTURES[1]?.name));

    expect(onChange).toHaveBeenCalled();
  });

  it("マスタが空でも入力欄そのものは出す", () => {
    renderField({ prefectures: [] });

    expect(screen.getByLabelText("都道府県")).toBeVisible();
    expect(within(screen.getByLabelText("都道府県")).queryAllByRole("option")).toHaveLength(0);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({ message: "都道府県を選択してください。" });

    expect((await axe(container)).violations).toEqual([]);
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { FILLED_ISSUE_OWN_VALUES } from "../../coupon-new.fixture";
import type { IssueOwnField } from "../../form-state";
import { EMPTY_ISSUE_OWN_VALUES } from "../../issue-rules";
import { IssueValidityFields, type IssueValidityFieldsProps } from "./validity-fields";

function renderFields(overrides: Partial<IssueValidityFieldsProps> = {}) {
  const props: IssueValidityFieldsProps = {
    values: EMPTY_ISSUE_OWN_VALUES,
    onValueChange: vi.fn(),
    onLeave: vi.fn(),
    messages: {},
    ...overrides,
  };

  return { ...render(<IssueValidityFields {...props} />), props };
}

function expiresAtField(): HTMLElement {
  return screen.getByLabelText("有効期限");
}

function usableFromField(): HTMLElement {
  return screen.getByLabelText("利用開始");
}

function minPurchaseField(): HTMLElement {
  return screen.getByRole("textbox", { name: "最低購入額（ドル）" });
}

const FIELDS: readonly { label: string; field: IssueOwnField; control: () => HTMLElement }[] = [
  { label: "有効期限", field: "expiresAt", control: expiresAtField },
  { label: "利用開始", field: "usableFrom", control: usableFromField },
  { label: "最低購入額", field: "minPurchaseAmount", control: minPurchaseField },
];

describe("IssueValidityFields", () => {
  // ----- 打つ前 -----
  it("3 つの欄を期限と条件としてまとめ、端末の時間帯で打つことを添える", () => {
    renderFields();

    expect(screen.getByRole("group", { name: "期限と条件" })).toHaveTextContent(
      "日時はこの端末の時間帯で入力します。",
    );
  });

  it.each(FIELDS)("$label は契約の欄名で送る", ({ control, field }) => {
    renderFields();

    expect(control()).toHaveAttribute("name", field);
  });

  it("有効期限と利用開始は日時の欄にする", () => {
    renderFields();

    expect(expiresAtField()).toHaveAttribute("type", "datetime-local");
    expect(usableFromField()).toHaveAttribute("type", "datetime-local");
  });

  it("最低購入額はドルの額と分かる名前で、小数を打てる入力方式で受ける", () => {
    renderFields();

    expect(minPurchaseField()).toHaveAttribute("type", "text");
    expect(minPurchaseField()).toHaveAttribute("inputmode", "decimal");
  });

  it("有効期限だけを必須にし、利用開始と最低購入額は任意にする", () => {
    renderFields();

    expect(expiresAtField()).toHaveAttribute("aria-required", "true");
    expect(usableFromField()).toHaveAttribute("aria-required", "false");
    expect(minPurchaseField()).toHaveAttribute("aria-required", "false");
  });

  it("欄ごとに、何を決める欄かを説明に添える", () => {
    renderFields();

    expect(expiresAtField()).toHaveAccessibleDescription("この日時からは使えなくなります。");
    expect(usableFromField()).toHaveAccessibleDescription(
      "空欄なら発行した時点から使えます。有効期限より前にします。",
    );
    expect(minPurchaseField()).toHaveAccessibleDescription(
      "この額以上の購入でだけ使えます。空欄なら額を問いません。",
    );
  });

  it("利用開始が空なら、空欄に戻す操作を出さない", () => {
    renderFields({ values: { ...FILLED_ISSUE_OWN_VALUES, usableFrom: "" } });

    expect(screen.queryByRole("button", { name: "利用開始を空欄に戻す" })).not.toBeInTheDocument();
  });

  it("日時の欄を決めると、その項目の名前と決めた値を伝える", () => {
    const { props } = renderFields();

    fireEvent.change(expiresAtField(), { target: { value: "2026-12-31T23:59" } });
    fireEvent.change(usableFromField(), { target: { value: "2026-10-15T09:00" } });

    expect(vi.mocked(props.onValueChange).mock.calls).toEqual([
      ["expiresAt", "2026-12-31T23:59"],
      ["usableFrom", "2026-10-15T09:00"],
    ]);
  });

  it("最低購入額を打つと、最低購入額の名前と打った値を伝える", async () => {
    const { props } = renderFields();

    await userEvent.type(minPurchaseField(), "5");

    expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith("minPurchaseAmount", "5");
  });

  it.each(FIELDS)("$label から離れると、その項目の名前を伝える", async ({ control, field }) => {
    const { props } = renderFields();

    await userEvent.click(control());
    await userEvent.tab();

    expect(props.onLeave).toHaveBeenCalledExactlyOnceWith(field);
  });

  // ----- 打った後 -----
  it("呼び出し元が持つ値を欄に出す", () => {
    renderFields({ values: { ...FILLED_ISSUE_OWN_VALUES, usableFrom: "2026-10-15T09:00" } });

    expect(expiresAtField()).toHaveValue(FILLED_ISSUE_OWN_VALUES.expiresAt);
    expect(usableFromField()).toHaveValue("2026-10-15T09:00");
    expect(minPurchaseField()).toHaveValue(FILLED_ISSUE_OWN_VALUES.minPurchaseAmount);
  });

  it("利用開始が決まっていれば、空欄に戻す操作を出し、押すと利用開始を空で伝える", async () => {
    const { props } = renderFields({
      values: { ...FILLED_ISSUE_OWN_VALUES, usableFrom: "2026-10-15T09:00" },
    });

    await userEvent.click(screen.getByRole("button", { name: "利用開始を空欄に戻す" }));

    expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith("usableFrom", "");
  });

  // ----- 誤りがあるとき -----
  it.each(FIELDS)("$label の誤りの文言は、その欄だけに結び付ける", ({ control, field }) => {
    renderFields({ messages: { [field]: "この欄の誤り" } });

    expect(control()).toHaveAttribute("aria-invalid", "true");
    expect(control()).toHaveAccessibleDescription(/この欄の誤り/);
    expect(
      FIELDS.filter((other) => other.field !== field).map((other) =>
        other.control().getAttribute("aria-invalid"),
      ),
    ).toEqual(["false", "false"]);
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      values: { ...FILLED_ISSUE_OWN_VALUES, usableFrom: "2026-10-15T09:00" },
      messages: {
        expiresAt: "有効期限の誤り",
        usableFrom: "利用開始の誤り",
        minPurchaseAmount: "最低購入額の誤り",
      },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { COUPON_VALIDITY_DAYS_MAX } from "@/adapters/client/api/product-discontinue-limits";

import { DiscontinueConditionsFields, type DiscontinueConditionValues } from "./conditions-fields";

const EMPTY: DiscontinueConditionValues = { couponDiscountRate: "", couponValidityDays: "" };

function renderFields(
  overrides: Partial<{
    values: DiscontinueConditionValues;
    messages: Partial<Record<keyof DiscontinueConditionValues, string>>;
    lockedReason: string;
  }> = {},
) {
  const onValuesChange = vi.fn();

  const { container } = render(
    <DiscontinueConditionsFields
      {...(overrides.lockedReason === undefined ? {} : { lockedReason: overrides.lockedReason })}
      messages={overrides.messages ?? {}}
      onValuesChange={onValuesChange}
      values={overrides.values ?? EMPTY}
    />,
  );

  return { container, onValuesChange };
}

function rateField(): HTMLElement {
  return screen.getByRole("textbox", { name: "値引き率（%）" });
}

function daysField(): HTMLElement {
  return screen.getByRole("textbox", { name: "有効日数" });
}

describe("DiscontinueConditionsFields", () => {
  it("2 つの欄を代替クーポンの条件としてまとめる", () => {
    renderFields();

    expect(screen.getByRole("group", { name: "代替クーポンの条件" })).toBeInTheDocument();
  });

  it("どちらの欄も既定値を置かず、空のまま必須にする", () => {
    renderFields();

    expect(rateField()).toHaveValue("");
    expect(daysField()).toHaveValue("");
    expect(rateField()).toBeRequired();
    expect(daysField()).toBeRequired();
  });

  it("値引き率は数値型の欄にせず、小数を打てる入力方式で受ける", () => {
    renderFields();

    expect(rateField()).toHaveAttribute("type", "text");
    expect(rateField()).toHaveAttribute("inputmode", "decimal");
  });

  it("有効日数は整数を打てる入力方式で受け、契約の上限を説明に添える", () => {
    renderFields();

    expect(daysField()).toHaveAttribute("type", "text");
    expect(daysField()).toHaveAttribute("inputmode", "numeric");
    expect(daysField()).toHaveAccessibleDescription(
      new RegExp(`最長 ${COUPON_VALIDITY_DAYS_MAX} 日です`),
    );
  });

  it("送るときの名前を、受け取る側と同じ綴りで持つ", () => {
    renderFields();

    expect(rateField()).toHaveAttribute("name", "couponDiscountRate");
    expect(daysField()).toHaveAttribute("name", "couponValidityDays");
  });

  it("呼び出し元が持つ値を欄に出す", () => {
    renderFields({ values: { couponDiscountRate: "12.5", couponValidityDays: "30" } });

    expect(rateField()).toHaveValue("12.5");
    expect(daysField()).toHaveValue("30");
  });

  it("値引き率を打つと、有効日数を保ったまま新しい値を伝える", async () => {
    const { onValuesChange } = renderFields({
      values: { couponDiscountRate: "", couponValidityDays: "30" },
    });

    await userEvent.type(rateField(), "5");

    expect(onValuesChange).toHaveBeenLastCalledWith({
      couponDiscountRate: "5",
      couponValidityDays: "30",
    });
  });

  it("有効日数を打つと、値引き率を保ったまま新しい値を伝える", async () => {
    const { onValuesChange } = renderFields({
      values: { couponDiscountRate: "10", couponValidityDays: "" },
    });

    await userEvent.type(daysField(), "7");

    expect(onValuesChange).toHaveBeenLastCalledWith({
      couponDiscountRate: "10",
      couponValidityDays: "7",
    });
  });

  it("欄から離れても、値も誤りも伝えない", async () => {
    const { onValuesChange } = renderFields();

    await userEvent.click(rateField());
    await userEvent.tab();

    expect(onValuesChange).not.toHaveBeenCalled();
    expect(rateField()).not.toHaveAttribute("aria-invalid", "true");
  });

  it("誤りの文言は、渡された欄だけに結び付ける", () => {
    renderFields({ messages: { couponValidityDays: "日数の誤り" } });

    expect(daysField()).toHaveAccessibleDescription(/日数の誤り/);
    expect(rateField()).not.toHaveAccessibleDescription(/日数の誤り/);
  });

  it("書き換えさせない理由を渡すと、どちらの欄も書き換えられず、理由を欄の組に結ぶ", async () => {
    const reason = "前回の結果が分かるまで、条件は書き換えられません。";
    const { onValuesChange } = renderFields({
      values: { couponDiscountRate: "10", couponValidityDays: "30" },
      lockedReason: reason,
    });

    await userEvent.type(rateField(), "5");
    await userEvent.type(daysField(), "1");

    expect(onValuesChange).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "代替クーポンの条件" })).toHaveAccessibleDescription(
      reason,
    );
  });

  it("書き換えさせない理由が無ければ、欄の組に説明を結ばない", () => {
    renderFields();

    expect(
      screen.getByRole("group", { name: "代替クーポンの条件" }),
    ).not.toHaveAccessibleDescription();
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      messages: { couponDiscountRate: "率の誤り", couponValidityDays: "日数の誤り" },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

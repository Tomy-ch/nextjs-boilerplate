// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  type CouponDiscountValues,
  EMPTY_COUPON_DISCOUNT_VALUES,
} from "../../../../coupon-discount";
import { CouponDiscountFields, type CouponDiscountFieldsProps } from "./coupon-discount-fields";

const FLAT: CouponDiscountValues = { kind: "flat", value: "5", maxAmount: "20" };
const RATE: CouponDiscountValues = { kind: "rate", value: "15", maxAmount: "20" };

function renderFields(overrides: Partial<CouponDiscountFieldsProps> = {}) {
  const props: CouponDiscountFieldsProps = {
    values: EMPTY_COUPON_DISCOUNT_VALUES,
    onValuesChange: vi.fn(),
    onLeave: vi.fn(),
    messages: {},
    ...overrides,
  };

  return { ...render(<CouponDiscountFields {...props} />), props };
}

function kindGroup(): HTMLElement {
  return screen.getByRole("group", { name: "値引きの種類" });
}

describe("CouponDiscountFields", () => {
  // ----- 種別を選ぶ前 -----
  it("種別を定額・定率の順に並べ、どちらも選ばずに出す", () => {
    renderFields();

    const scope = within(kindGroup());

    expect(scope.getAllByRole("radio")).toEqual([
      scope.getByRole("radio", { name: "定額" }),
      scope.getByRole("radio", { name: "定率" }),
    ]);
    expect(scope.getByRole("radio", { name: "定額" })).not.toBeChecked();
    expect(scope.getByRole("radio", { name: "定率" })).not.toBeChecked();
  });

  it("種別を選ぶまで、額の欄を出さない", () => {
    renderFields();

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("種別を選ぶと、打たれた額と上限を保ったまま新しい種別を伝える", async () => {
    const { props } = renderFields({
      values: { ...EMPTY_COUPON_DISCOUNT_VALUES, value: "5", maxAmount: "20" },
    });

    await userEvent.click(screen.getByRole("radio", { name: "定率" }));

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({
      kind: "rate",
      value: "5",
      maxAmount: "20",
    });
  });

  // ----- 定額のとき -----
  it("定額では、ドルの額の欄だけを出し、上限の欄を出さない", () => {
    renderFields({ values: FLAT });

    expect(screen.getByRole("radio", { name: "定額" })).toBeChecked();
    expect(screen.getAllByRole("textbox")).toEqual([
      screen.getByRole("textbox", { name: "値引き額（ドル）" }),
    ]);
    expect(screen.queryByRole("textbox", { name: "上限額（ドル）" })).not.toBeInTheDocument();
  });

  it("定額の額は必須で、ドルで打つことを説明に添える", () => {
    renderFields({ values: FLAT });

    const value = screen.getByRole("textbox", { name: "値引き額（ドル）" });

    expect(value).toHaveValue("5");
    expect(value).toHaveAttribute("name", "discountValue");
    expect(value).toHaveAttribute("inputmode", "decimal");
    expect(value).toHaveAttribute("aria-required", "true");
    expect(value).toHaveAccessibleDescription(
      "5 と打つと 5 ドル引きです。引く額は対象の額が上限です。",
    );
  });

  it("定率へ切り替えると、隠れていた上限を捨てずに伝える", async () => {
    const { props } = renderFields({ values: FLAT });

    await userEvent.click(screen.getByRole("radio", { name: "定率" }));

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({ ...FLAT, kind: "rate" });
  });

  // ----- 定率のとき -----
  it("定率では、率の欄と、任意の上限額の欄を出す", () => {
    renderFields({ values: RATE });

    const value = screen.getByRole("textbox", { name: "値引き率（%）" });
    const maxAmount = screen.getByRole("textbox", { name: "上限額（ドル）" });

    expect(screen.getByRole("radio", { name: "定率" })).toBeChecked();
    expect(value).toHaveValue("15");
    expect(value).toHaveAttribute("aria-required", "true");
    expect(value).toHaveAccessibleDescription("10 と打つと 10% 引きです。");
    expect(maxAmount).toHaveValue("20");
    expect(maxAmount).toHaveAttribute("name", "discountMaxAmount");
    expect(maxAmount).toHaveAttribute("inputmode", "decimal");
    expect(maxAmount).toHaveAttribute("aria-required", "false");
    expect(maxAmount).toHaveAccessibleDescription(
      "1 回の値引きで引ける額の上限です。空欄なら上限を設けません。",
    );
  });

  it("定額へ切り替えると、打たれた額と上限を保ったまま伝える", async () => {
    const { props } = renderFields({ values: RATE });

    await userEvent.click(screen.getByRole("radio", { name: "定額" }));

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({ ...RATE, kind: "flat" });
  });

  it("率を打つと、種別と上限を保ったまま新しい値を伝える", async () => {
    const { props } = renderFields({ values: { ...RATE, value: "" } });

    await userEvent.type(screen.getByRole("textbox", { name: "値引き率（%）" }), "8");

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({ ...RATE, value: "8" });
  });

  it("上限額を打つと、種別と率を保ったまま新しい値を伝える", async () => {
    const { props } = renderFields({ values: { ...RATE, maxAmount: "" } });

    await userEvent.type(screen.getByRole("textbox", { name: "上限額（ドル）" }), "9");

    expect(props.onValuesChange).toHaveBeenCalledExactlyOnceWith({ ...RATE, maxAmount: "9" });
  });

  it("率の欄から離れると、額の項目の名前を伝える", async () => {
    const { props } = renderFields({ values: RATE });

    await userEvent.click(screen.getByRole("textbox", { name: "値引き率（%）" }));
    await userEvent.tab();

    expect(props.onLeave).toHaveBeenCalledExactlyOnceWith("discountValue");
  });

  it("上限額の欄から離れると、上限の項目の名前を伝える", async () => {
    const { props } = renderFields({ values: RATE });

    await userEvent.click(screen.getByRole("textbox", { name: "上限額（ドル）" }));
    await userEvent.tab();

    expect(props.onLeave).toHaveBeenCalledExactlyOnceWith("discountMaxAmount");
  });

  // ----- 誤りがあるとき -----
  it("種別の誤りは、種別の群に結び付ける", () => {
    renderFields({ messages: { discountKind: "値引きの種類を選んでください。" } });

    expect(kindGroup()).toHaveAccessibleDescription("値引きの種類を選んでください。");
  });

  it("額の誤りは額の欄だけに結び付け、種別の群と上限額の欄には結ばない", () => {
    renderFields({ values: RATE, messages: { discountValue: "率が範囲の外です。" } });

    expect(screen.getByRole("textbox", { name: "値引き率（%）" })).toHaveAccessibleDescription(
      /率が範囲の外です。/,
    );
    expect(screen.getByRole("textbox", { name: "値引き率（%）" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "上限額（ドル）" })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
    expect(kindGroup()).not.toHaveAccessibleDescription();
  });

  it("上限額の誤りは上限額の欄だけに結び付ける", () => {
    renderFields({ values: RATE, messages: { discountMaxAmount: "上限額が読めません。" } });

    expect(screen.getByRole("textbox", { name: "上限額（ドル）" })).toHaveAccessibleDescription(
      /上限額が読めません。/,
    );
    expect(screen.getByRole("textbox", { name: "上限額（ドル）" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "値引き率（%）" })).toHaveAttribute(
      "aria-invalid",
      "false",
    );
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      values: { kind: "rate", value: "150", maxAmount: "0" },
      messages: {
        discountKind: "種別の誤り",
        discountValue: "率の誤り",
        discountMaxAmount: "上限額の誤り",
      },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

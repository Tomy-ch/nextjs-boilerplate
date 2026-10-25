// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  type CampaignLimitField,
  CampaignLimitFields,
  type CampaignLimitFieldsProps,
} from "./limit-fields";

const EMPTY: CampaignLimitFieldsProps["values"] = {
  totalLimit: "",
  perUserLimit: "",
  minPurchaseAmount: "",
};

function renderFields(overrides: Partial<CampaignLimitFieldsProps> = {}) {
  const props: CampaignLimitFieldsProps = {
    values: EMPTY,
    onValueChange: vi.fn(),
    onLeave: vi.fn(),
    messages: {},
    ...overrides,
  };

  return { ...render(<CampaignLimitFields {...props} />), props };
}

function totalField(): HTMLElement {
  return screen.getByRole("spinbutton", { name: "総枚数の上限" });
}

function perUserField(): HTMLElement {
  return screen.getByRole("spinbutton", { name: "1 人あたりの上限" });
}

function minPurchaseField(): HTMLElement {
  return screen.getByRole("textbox", { name: "最低購入額（ドル）" });
}

const FIELDS: readonly { label: string; field: CampaignLimitField; control: () => HTMLElement }[] =
  [
    { label: "総枚数の上限", field: "totalLimit", control: totalField },
    { label: "1 人あたりの上限", field: "perUserLimit", control: perUserField },
    { label: "最低購入額", field: "minPurchaseAmount", control: minPurchaseField },
  ];

describe("CampaignLimitFields", () => {
  it("3 つの欄を上限と条件としてまとめる", () => {
    renderFields();

    expect(screen.getByRole("group", { name: "上限と条件" })).toBeInTheDocument();
  });

  it("枚数の 2 欄は 1 以上の整数を受ける数値型の欄にする", () => {
    renderFields();

    for (const control of [totalField(), perUserField()]) {
      expect(control).toHaveAttribute("type", "number");
      expect(control).toHaveAttribute("min", "1");
      expect(control).toHaveAttribute("step", "1");
      expect(control).toHaveAttribute("inputmode", "numeric");
    }
  });

  it("最低購入額は数値型にせず、小数を打てる入力方式で受ける", () => {
    renderFields();

    expect(minPurchaseField()).toHaveAttribute("type", "text");
    expect(minPurchaseField()).toHaveAttribute("inputmode", "decimal");
  });

  it("枚数の 2 欄は必須、最低購入額は任意にする", () => {
    renderFields();

    expect(totalField()).toHaveAttribute("aria-required", "true");
    expect(perUserField()).toHaveAttribute("aria-required", "true");
    expect(minPurchaseField()).toHaveAttribute("aria-required", "false");
  });

  it("欄ごとに、何を決める欄かを説明に添える", () => {
    renderFields();

    expect(totalField()).toHaveAccessibleDescription("配れるクーポンの総数です。");
    expect(perUserField()).toHaveAccessibleDescription(
      "1 人が受け取れる枚数です。総枚数以下にします。",
    );
    expect(minPurchaseField()).toHaveAccessibleDescription(
      "この額以上の購入でだけ使えます。空欄なら額を問いません。",
    );
  });

  it("送るときの名前を、契約の欄名と同じ綴りで持つ", () => {
    renderFields();

    expect(totalField()).toHaveAttribute("name", "totalLimit");
    expect(perUserField()).toHaveAttribute("name", "perUserLimit");
    expect(minPurchaseField()).toHaveAttribute("name", "minPurchaseAmount");
  });

  it("呼び出し元が持つ値を欄に出す", () => {
    renderFields({ values: { totalLimit: "1000", perUserLimit: "1", minPurchaseAmount: "50" } });

    expect(totalField()).toHaveValue(1000);
    expect(perUserField()).toHaveValue(1);
    expect(minPurchaseField()).toHaveValue("50");
  });

  it.each(FIELDS)(
    "$label を打つと、その項目の名前と新しい値を伝える",
    async ({ control, field }) => {
      const { props } = renderFields();

      await userEvent.type(control(), "5");

      expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith(field, "5");
    },
  );

  it.each(FIELDS)("$label から離れると、その項目の名前を伝える", async ({ control, field }) => {
    const { props } = renderFields();

    await userEvent.click(control());
    await userEvent.tab();

    expect(props.onLeave).toHaveBeenCalledExactlyOnceWith(field);
  });

  it("誤りの文言は、渡された欄だけに結び付ける", () => {
    renderFields({ messages: { perUserLimit: "総枚数を超えています。" } });

    expect(perUserField()).toHaveAttribute("aria-invalid", "true");
    expect(perUserField()).toHaveAccessibleDescription(/総枚数を超えています。/);
    expect(totalField()).toHaveAttribute("aria-invalid", "false");
    expect(minPurchaseField()).toHaveAttribute("aria-invalid", "false");
  });

  it("最低購入額の誤りは、最低購入額の欄だけに結び付ける", () => {
    renderFields({ messages: { minPurchaseAmount: "額が読めません。" } });

    expect(minPurchaseField()).toHaveAttribute("aria-invalid", "true");
    expect(minPurchaseField()).toHaveAccessibleDescription(/額が読めません。/);
    expect(totalField()).toHaveAttribute("aria-invalid", "false");
    expect(perUserField()).toHaveAttribute("aria-invalid", "false");
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      values: { totalLimit: "0", perUserLimit: "5", minPurchaseAmount: "0.001" },
      messages: {
        totalLimit: "総枚数の誤り",
        perUserLimit: "1 人あたりの誤り",
        minPurchaseAmount: "最低購入額の誤り",
      },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

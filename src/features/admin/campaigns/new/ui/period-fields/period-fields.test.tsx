// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  type CampaignPeriodField,
  CampaignPeriodFields,
  type CampaignPeriodFieldsProps,
} from "./period-fields";

const EMPTY: CampaignPeriodFieldsProps["values"] = {
  startsAt: "",
  endsAt: "",
  couponExpiresAt: "",
  usableFrom: "",
};

const FILLED: CampaignPeriodFieldsProps["values"] = {
  startsAt: "2026-10-01T00:00",
  endsAt: "2026-11-30T23:59",
  couponExpiresAt: "2026-12-31T23:59",
  usableFrom: "2026-10-05T00:00",
};

function renderFields(overrides: Partial<CampaignPeriodFieldsProps> = {}) {
  const props: CampaignPeriodFieldsProps = {
    values: EMPTY,
    onValueChange: vi.fn(),
    onLeave: vi.fn(),
    messages: {},
    ...overrides,
  };

  return { ...render(<CampaignPeriodFields {...props} />), props };
}

const FIELDS: readonly { label: string; field: CampaignPeriodField }[] = [
  { label: "配布開始", field: "startsAt" },
  { label: "配布終了", field: "endsAt" },
  { label: "クーポンの有効期限", field: "couponExpiresAt" },
  { label: "クーポンの利用開始", field: "usableFrom" },
];

describe("CampaignPeriodFields", () => {
  // ----- 打つ前 -----
  it("4 つの欄を期間としてまとめ、端末の時間帯で打つことを添える", () => {
    renderFields();

    expect(screen.getByRole("group", { name: "期間" })).toHaveTextContent(
      "日時はこの端末の時間帯で入力します。",
    );
  });

  it.each(FIELDS)("$label は日時の欄として、契約の欄名で送る", ({ field, label }) => {
    renderFields();

    const control = screen.getByLabelText(label);

    expect(control).toHaveAttribute("type", "datetime-local");
    expect(control).toHaveAttribute("name", field);
  });

  it("利用開始だけを任意にし、他の 3 欄は必須にする", () => {
    renderFields();

    expect(screen.getByLabelText("配布開始")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("配布終了")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("クーポンの有効期限")).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText("クーポンの利用開始")).toHaveAttribute("aria-required", "false");
  });

  it("欄ごとに、何を決める欄かを説明に添える", () => {
    renderFields();

    expect(screen.getByLabelText("配布開始")).toHaveAccessibleDescription(
      "この日時から受け取れます。",
    );
    expect(screen.getByLabelText("配布終了")).toHaveAccessibleDescription(
      "この日時からは受け取れません。",
    );
    expect(screen.getByLabelText("クーポンの有効期限")).toHaveAccessibleDescription(
      "配布終了より後にします。",
    );
    expect(screen.getByLabelText("クーポンの利用開始")).toHaveAccessibleDescription(
      "空欄なら受け取った時点から使えます。",
    );
  });

  it("利用開始が空なら、空欄に戻す操作を出さない", () => {
    renderFields({ values: { ...FILLED, usableFrom: "" } });

    expect(screen.queryByRole("button", { name: "利用開始を空欄に戻す" })).not.toBeInTheDocument();
  });

  it.each(FIELDS)("$label を決めると、その項目の名前と決めた値を伝える", ({ field, label }) => {
    const { props } = renderFields();

    fireEvent.change(screen.getByLabelText(label), { target: { value: "2026-10-01T10:00" } });

    expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith(field, "2026-10-01T10:00");
  });

  it.each(FIELDS)("$label から離れると、その項目の名前を伝える", async ({ field, label }) => {
    const { props } = renderFields();

    await userEvent.click(screen.getByLabelText(label));
    await userEvent.tab();

    expect(props.onLeave).toHaveBeenCalledExactlyOnceWith(field);
  });

  // ----- 打った後 -----
  it("呼び出し元が持つ値を欄に出す", () => {
    renderFields({ values: FILLED });

    expect(screen.getByLabelText("配布開始")).toHaveValue("2026-10-01T00:00");
    expect(screen.getByLabelText("配布終了")).toHaveValue("2026-11-30T23:59");
    expect(screen.getByLabelText("クーポンの有効期限")).toHaveValue("2026-12-31T23:59");
    expect(screen.getByLabelText("クーポンの利用開始")).toHaveValue("2026-10-05T00:00");
  });

  it("利用開始が決まっていれば、空欄に戻す操作を出し、押すと利用開始を空で伝える", async () => {
    const { props } = renderFields({ values: FILLED });

    await userEvent.click(screen.getByRole("button", { name: "利用開始を空欄に戻す" }));

    expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith("usableFrom", "");
  });

  // ----- 誤りがあるとき -----
  it("誤りの文言は、渡された欄だけに結び付ける", () => {
    renderFields({ values: FILLED, messages: { endsAt: "配布開始より後にしてください。" } });

    expect(screen.getByLabelText("配布終了")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("配布終了")).toHaveAccessibleDescription(
      /配布開始より後にしてください。/,
    );
    expect(screen.getByLabelText("配布開始")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("クーポンの有効期限")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("クーポンの利用開始")).toHaveAttribute("aria-invalid", "false");
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderFields({
      values: FILLED,
      messages: {
        startsAt: "配布開始の誤り",
        endsAt: "配布終了の誤り",
        couponExpiresAt: "有効期限の誤り",
        usableFrom: "利用開始の誤り",
      },
    });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

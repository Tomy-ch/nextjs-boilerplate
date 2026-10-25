// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { AdminRadioField, type AdminRadioFieldProps } from "./radio-field";

type Kind = "first" | "second" | "third";

const OPTIONS: AdminRadioFieldProps<Kind>["options"] = [
  { value: "first", label: "ひとつめ" },
  { value: "second", label: "ふたつめ" },
  { value: "third", label: "みっつめ" },
];

function renderField(overrides: Partial<AdminRadioFieldProps<Kind>> = {}) {
  const props: AdminRadioFieldProps<Kind> = {
    legend: "種類",
    name: "kind",
    options: OPTIONS,
    value: "",
    onValueChange: vi.fn(),
    required: true,
    ...overrides,
  };

  return { ...render(<AdminRadioField {...props} />), props };
}

function group(): HTMLElement {
  return screen.getByRole("group", { name: "種類" });
}

describe("AdminRadioField", () => {
  // ----- 選ぶ前 -----
  it("選択肢を群の名前でまとめ、渡された順に並べる", () => {
    renderField();

    const scope = within(group());

    expect(scope.getAllByRole("radio")).toEqual([
      scope.getByRole("radio", { name: "ひとつめ" }),
      scope.getByRole("radio", { name: "ふたつめ" }),
      scope.getByRole("radio", { name: "みっつめ" }),
    ]);
  });

  it("値が空なら、どれも選ばれていない状態で出す", () => {
    renderField();

    expect(screen.getByRole("radio", { name: "ひとつめ" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "ふたつめ" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "みっつめ" })).not.toBeChecked();
  });

  it("どの選択肢も、送るときの名前を共有する", () => {
    renderField();

    expect(
      within(group())
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("name")),
    ).toEqual(["kind", "kind", "kind"]);
  });

  it("必須の項目には、群の名前の横に必須と示す", () => {
    renderField({ required: true });

    expect(within(group()).getByText("必須")).toBeInTheDocument();
    expect(within(group()).queryByText("任意")).not.toBeInTheDocument();
  });

  it("任意の項目には、群の名前の横に任意と示す", () => {
    renderField({ required: false });

    expect(within(group()).getByText("任意")).toBeInTheDocument();
    expect(within(group()).queryByText("必須")).not.toBeInTheDocument();
  });

  // ----- 選んだ後 -----
  it("選ばれている値の選択肢だけを選んだ状態で出す", () => {
    renderField({ value: "second" });

    expect(screen.getByRole("radio", { name: "ふたつめ" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "ひとつめ" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "みっつめ" })).not.toBeChecked();
  });

  it("別の選択肢を選ぶと、その選択肢の値を伝える", async () => {
    const { props } = renderField({ value: "first" });

    await userEvent.click(screen.getByRole("radio", { name: "みっつめ" }));

    expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith("third");
  });

  it("選択肢の名前を押しても、その選択肢を選んだことになる", async () => {
    const { props } = renderField();

    await userEvent.click(screen.getByText("ふたつめ"));

    expect(props.onValueChange).toHaveBeenCalledExactlyOnceWith("second");
  });

  // ----- 誤りがあるとき -----
  it("誤りが無ければ、群に説明を結ばず、どの選択肢も誤りとしない", () => {
    renderField();

    expect(group()).not.toHaveAccessibleDescription();
    expect(
      within(group())
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("aria-invalid")),
    ).toEqual(["false", "false", "false"]);
  });

  it("誤りがあれば文言を群に結び付け、どの選択肢も誤りとする", () => {
    renderField({ message: "種類を選んでください。" });

    expect(group()).toHaveAccessibleDescription("種類を選んでください。");
    expect(within(group()).getByRole("alert")).toHaveTextContent("種類を選んでください。");
    expect(
      within(group())
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("aria-invalid")),
    ).toEqual(["true", "true", "true"]);
  });

  it("誤りがある状態で a11y 検査を通る", async () => {
    const { container } = renderField({ message: "種類を選んでください。" });

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Input } from "../../design-system/form/input/input";
import { FormField } from "./form-field";

const CONTROL_ID = "last-name";
const ERROR_ID = "last-name-error";
const DESCRIPTION_ID = "last-name-description";

/** 入力欄を差し込んだ既定の組。個別の props だけを上書きして用いる。 */
function renderField(props: Partial<Parameters<typeof FormField>[0]> = {}) {
  return render(
    <FormField controlId={CONTROL_ID} label="姓" required {...props}>
      {(control) => <Input {...control} name="lastName" />}
    </FormField>,
  );
}

describe("FormField", () => {
  it("差し込んだ入力欄を項目の名前で引けるようにする", () => {
    renderField();

    expect(screen.getByLabelText("姓")).toBeVisible();
  });

  it("印を label の中へ入れず、項目の名前を印の文言で汚さない", () => {
    renderField();

    expect(screen.getByLabelText("姓")).toHaveAccessibleName("姓");
  });

  it("必須の項目に必須の印を並べる", () => {
    renderField();

    expect(screen.getByText("必須")).toBeVisible();
  });

  it("任意の項目に任意の印を並べる", () => {
    renderField({ required: false });

    expect(screen.getByText("任意")).toBeVisible();
  });

  it("補足を渡すと誤りとは別に常時出す", () => {
    renderField({ description: "半角で入力してください。" });

    expect(screen.getByText("半角で入力してください。")).toBeVisible();
  });

  it("補足に入力欄が参照できる id を与える", () => {
    renderField({ description: "半角で入力してください。" });

    expect(screen.getByText("半角で入力してください。")).toHaveAttribute(
      "id",
      `${CONTROL_ID}-description`,
    );
  });

  it("補足を渡さないとき補足の枠ごと描かない", () => {
    const { container } = renderField();

    expect(container.querySelector("[data-slot=field-description]")).toBeNull();
  });

  it("誤りを渡すと支援技術が読み上げる位置へ出す", () => {
    renderField({ message: "姓を入力してください。" });

    expect(screen.getByRole("alert")).toHaveTextContent("姓を入力してください。");
  });

  it("誤りの文言に入力欄が参照できる id を与える", () => {
    renderField({ message: "姓を入力してください。" });

    expect(screen.getByRole("alert")).toHaveAttribute("id", ERROR_ID);
  });

  it("誤りを渡さないとき誤りの枠ごと描かない", () => {
    renderField();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("誤りがあるとき外枠に見た目を切り替える印を付ける", () => {
    const { container } = renderField({ message: "姓を入力してください。" });

    expect(container.querySelector("[data-slot=field]")).toHaveAttribute("data-invalid", "true");
  });

  it("誤りが無いとき外枠の印を立てない", () => {
    const { container } = renderField();

    expect(container.querySelector("[data-slot=field]")).toHaveAttribute("data-invalid", "false");
  });

  it("入力欄の ARIA 属性を children へ渡す", () => {
    renderField({ description: "半角で入力してください。", message: "姓を入力してください。" });

    const control = screen.getByLabelText("姓");

    expect(control).toHaveAttribute("id", CONTROL_ID);
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAttribute("aria-required", "true");
    expect(control).toHaveAttribute("aria-describedby", `${DESCRIPTION_ID} ${ERROR_ID}`);
  });

  it("誤りが無くても `aria-invalid` を落とさない", () => {
    // 属性ごと消すと、支援技術には「一度も検証していない」と区別が付かない。
    renderField();

    expect(screen.getByLabelText("姓")).toHaveAttribute("aria-invalid", "false");
  });

  it("誤りの id を入力欄の id から導き、呼び出し元に組ませない", () => {
    renderField({ message: "姓を入力してください。" });

    expect(screen.getByRole("alert")).toHaveAttribute("id", ERROR_ID);
    expect(screen.getByLabelText("姓")).toHaveAttribute("aria-describedby", ERROR_ID);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderField({
      description: "半角で入力してください。",
      message: "姓を入力してください。",
    });

    expect((await axe(container)).violations).toEqual([]);
  });
});

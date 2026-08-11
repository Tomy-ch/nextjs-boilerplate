// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { useId } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Input } from "../../form/input/input";
import { Button } from "../button/button";
import { BUTTON_VARIANT } from "../button/button.definition";
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from "./button-group";
import { BUTTON_GROUP_ORIENTATION } from "./button-group.definition";

function AmountField() {
  const amountId = useId();

  return (
    <ButtonGroup aria-label="金額の指定">
      <ButtonGroupText asChild>
        <label htmlFor={amountId}>金額</label>
      </ButtonGroupText>
      <Input id={amountId} name="amount" />
    </ButtonGroup>
  );
}

function TwoActions() {
  return (
    <ButtonGroup aria-label="表示の切り替え">
      <Button variant={BUTTON_VARIANT.OUTLINE}>一覧</Button>
      <Button variant={BUTTON_VARIANT.OUTLINE}>地図</Button>
    </ButtonGroup>
  );
}

describe("ButtonGroup", () => {
  it("aria-label で名前を持つ group として公開する", () => {
    render(<TwoActions />);

    expect(screen.getByRole("group", { name: "表示の切り替え" })).toHaveAttribute(
      "data-slot",
      "button-group",
    );
  });

  it("束ねた操作は個々の button として辿れる", () => {
    render(<TwoActions />);

    expect(screen.getByRole("button", { name: "一覧" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "地図" })).toBeInTheDocument();
  });

  it("向きを省略すると横並びになる", () => {
    render(<TwoActions />);

    expect(screen.getByRole("group", { name: "表示の切り替え" })).toHaveAttribute(
      "data-orientation",
      BUTTON_GROUP_ORIENTATION.HORIZONTAL,
    );
  });

  it("縦積みを指定すると向きを data-orientation で公開する", () => {
    render(
      <ButtonGroup aria-label="表示の切り替え" orientation={BUTTON_GROUP_ORIENTATION.VERTICAL}>
        <Button variant={BUTTON_VARIANT.OUTLINE}>一覧</Button>
        <Button variant={BUTTON_VARIANT.OUTLINE}>地図</Button>
      </ButtonGroup>,
    );

    expect(screen.getByRole("group", { name: "表示の切り替え" })).toHaveAttribute(
      "data-orientation",
      BUTTON_GROUP_ORIENTATION.VERTICAL,
    );
  });

  it("操作ではない語は button にせず表示する", () => {
    render(
      <ButtonGroup aria-label="金額の指定">
        <ButtonGroupText>￥</ButtonGroupText>
        <Button variant={BUTTON_VARIANT.OUTLINE}>変更</Button>
      </ButtonGroup>,
    );

    expect(screen.getByText("￥")).toHaveAttribute("data-slot", "button-group-text");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("語を label へ合成して入力欄の名前にできる", () => {
    render(<AmountField />);

    expect(screen.getByLabelText("金額")).toHaveAttribute("name", "amount");
  });

  it("区切りは既定で読み上げ対象にしない", () => {
    render(
      <ButtonGroup aria-label="項目の操作">
        <Button variant={BUTTON_VARIANT.OUTLINE}>編集</Button>
        <ButtonGroupSeparator />
        <Button variant={BUTTON_VARIANT.OUTLINE}>複製</Button>
      </ButtonGroup>,
    );

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<TwoActions />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("buttonGroupVariants", () => {
  // ----- 正常系 -----
  it("既定の見た目の class を返す", () => {
    expect(buttonGroupVariants()).toContain("flex");
  });

  it("orientation の指定を class へ反映する", () => {
    expect(buttonGroupVariants({ orientation: "vertical" })).not.toBe(buttonGroupVariants());
  });
});

describe("ButtonGroupText", () => {
  // ----- 正常系 -----
  it("文言の枠として slot を持つ要素を描画する", () => {
    render(<ButtonGroupText>単位</ButtonGroupText>);

    expect(screen.getByText("単位")).toHaveAttribute("data-slot", "button-group-text");
  });
});

describe("ButtonGroupSeparator", () => {
  // ----- 正常系 -----
  it("区切りとして slot を持つ要素を描画する", () => {
    const { container } = render(<ButtonGroupSeparator />);

    expect(container.querySelector('[data-slot="button-group-separator"]')).not.toBeNull();
  });
});

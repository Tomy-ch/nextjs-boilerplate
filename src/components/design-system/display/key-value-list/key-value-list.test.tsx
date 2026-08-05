// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "./key-value-list";

function Fixture() {
  return (
    <KeyValueList>
      <KeyValueItem>
        <KeyValueLabel>名称</KeyValueLabel>
        <KeyValueValue>標準プラン</KeyValueValue>
      </KeyValueItem>
      <KeyValueItem>
        <KeyValueLabel>補足</KeyValueLabel>
        <KeyValueValue>
          <KeyValueEmpty />
        </KeyValueValue>
      </KeyValueItem>
    </KeyValueList>
  );
}

describe("KeyValueList", () => {
  it("記述リストの意味論で label と value を対にする", () => {
    const { container } = render(<Fixture />);

    const list = container.querySelector("[data-slot='key-value-list']");
    const labels = container.querySelectorAll("[data-slot='key-value-label']");
    const values = container.querySelectorAll("[data-slot='key-value-value']");

    expect(list?.tagName).toBe("DL");
    expect([...labels].map((label) => label.tagName)).toEqual(["DT", "DT"]);
    expect([...values].map((value) => value.tagName)).toEqual(["DD", "DD"]);
  });

  it("label と value の対を一つの行としてまとめる", () => {
    const { container } = render(<Fixture />);

    const item = container.querySelector("[data-slot='key-value-item']");

    expect(item?.tagName).toBe("DIV");
    expect(item?.querySelector("[data-slot='key-value-label']")).toHaveTextContent("名称");
    expect(item?.querySelector("[data-slot='key-value-value']")).toHaveTextContent("標準プラン");
  });

  it("値が無い項目でも行を残す", () => {
    const { container } = render(<Fixture />);

    expect(container.querySelectorAll("[data-slot='key-value-item']")).toHaveLength(2);
    expect(screen.getByText("補足")).toBeVisible();
  });

  it("空値の記号は支援技術から隠し、読み上げ用の語を添える", () => {
    const { container } = render(<Fixture />);

    const empty = container.querySelector("[data-slot='key-value-empty']");

    expect(empty?.querySelector("[aria-hidden='true']")).toHaveTextContent("—");
    expect(screen.getByText("未設定")).toBeInTheDocument();
  });

  it("読み上げ用の語を呼び出し元が変えられる", () => {
    render(
      <KeyValueList>
        <KeyValueItem>
          <KeyValueLabel>補足</KeyValueLabel>
          <KeyValueValue>
            <KeyValueEmpty>登録されていません</KeyValueEmpty>
          </KeyValueValue>
        </KeyValueItem>
      </KeyValueList>,
    );

    expect(screen.getByText("登録されていません")).toBeInTheDocument();
  });

  it("native 属性をそのまま通す", () => {
    const { container } = render(
      <KeyValueList aria-label="対象の属性">
        <KeyValueItem data-testid="item">
          <KeyValueLabel lang="ja">名称</KeyValueLabel>
          <KeyValueValue>標準プラン</KeyValueValue>
        </KeyValueItem>
      </KeyValueList>,
    );

    expect(container.querySelector("dl")).toHaveAttribute("aria-label", "対象の属性");
    expect(screen.getByTestId("item")).toBeInTheDocument();
    expect(container.querySelector("dt")).toHaveAttribute("lang", "ja");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

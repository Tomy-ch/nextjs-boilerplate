// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ToggleGroupClient, ToggleGroupClientItem } from "./toggle-group-client";

function SingleFixture() {
  return (
    <ToggleGroupClient aria-label="表示通貨" defaultValue="jpy" type="single">
      <ToggleGroupClientItem value="jpy">JPY</ToggleGroupClientItem>
      <ToggleGroupClientItem value="usd">USD</ToggleGroupClientItem>
    </ToggleGroupClient>
  );
}

function MultipleFixture() {
  const [value, setValue] = useState<string[]>(["price"]);
  const handleChange = useCallback((next: string[]) => setValue(next), []);

  return (
    <>
      <ToggleGroupClient
        aria-label="表示する列"
        onValueChange={handleChange}
        type="multiple"
        value={value}
      >
        <ToggleGroupClientItem value="price">価格</ToggleGroupClientItem>
        <ToggleGroupClientItem value="archived">アーカイブ</ToggleGroupClientItem>
      </ToggleGroupClient>
      <output>{value.join(",")}</output>
    </>
  );
}

describe("ToggleGroupClient", () => {
  it("single では radiogroup と radio の意味論になる", () => {
    render(<SingleFixture />);

    const group = screen.getByRole("radiogroup", { name: "表示通貨" });

    expect(group).toHaveAttribute("data-slot", "toggle-group");
    expect(screen.getByRole("radio", { name: "JPY" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "USD" })).not.toBeChecked();
  });

  it("multiple では toolbar と aria-pressed の意味論になる", () => {
    render(<MultipleFixture />);

    expect(screen.getByRole("toolbar", { name: "表示する列" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "価格", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アーカイブ", pressed: false })).toBeInTheDocument();
  });

  it("選択中の項目は data-state=on を持ち、面の指定がそこに効く", () => {
    render(<SingleFixture />);

    const selected = screen.getByRole("radio", { name: "JPY" });

    expect(selected).toHaveAttribute("data-state", "on");
    expect(selected).toHaveClass("data-[state=on]:bg-accent");
  });

  it("single では選択が排他的に切り替わる", () => {
    render(<SingleFixture />);

    fireEvent.click(screen.getByRole("radio", { name: "USD" }));

    expect(screen.getByRole("radio", { name: "USD" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "JPY" })).not.toBeChecked();
  });

  it("multiple では複数を同時に選べ、呼び出し元へ配列で通知する", () => {
    render(<MultipleFixture />);

    fireEvent.click(screen.getByRole("button", { name: "アーカイブ" }));

    expect(screen.getByRole("status")).toHaveTextContent("price,archived");
  });

  it("form へ送る値を持たない", () => {
    const { container } = render(<SingleFixture />);

    expect(container.querySelector("input")).toBeNull();
  });

  it("variant と size を集合から項目へ引き継ぐ", () => {
    render(
      <ToggleGroupClient
        aria-label="表示通貨"
        defaultValue="jpy"
        size="lg"
        type="single"
        variant="outline"
      >
        <ToggleGroupClientItem value="jpy">JPY</ToggleGroupClientItem>
      </ToggleGroupClient>,
    );

    const item = screen.getByRole("radio", { name: "JPY" });

    expect(item).toHaveAttribute("data-variant", "outline");
    expect(item).toHaveAttribute("data-size", "lg");
    expect(item).toHaveClass("h-10");
  });

  it("spacing を CSS 変数として渡す", () => {
    render(<SingleFixture />);

    expect(screen.getByRole("radiogroup", { name: "表示通貨" })).toHaveStyle({ "--gap": "0" });
  });

  it("disabled の項目は操作を受け付けない", () => {
    render(
      <ToggleGroupClient aria-label="表示通貨" defaultValue="jpy" type="single">
        <ToggleGroupClientItem value="jpy">JPY</ToggleGroupClientItem>
        <ToggleGroupClientItem disabled value="eur">
          EUR
        </ToggleGroupClientItem>
      </ToggleGroupClient>,
    );

    const disabled = screen.getByRole("radio", { name: "EUR" });

    expect(disabled).toBeDisabled();
    expect(disabled).not.toBeChecked();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<SingleFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("ToggleGroupClientItem", () => {
  // ----- 正常系 -----
  it("選択肢 1 件を radio として slot つきで描画する", () => {
    render(<SingleFixture />);

    expect(screen.getByRole("radio", { name: "JPY" })).toHaveAttribute(
      "data-slot",
      "toggle-group-item",
    );
  });

  it("選択中の項目を押下状態として示す", () => {
    render(<SingleFixture />);

    expect(screen.getByRole("radio", { name: "JPY" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "USD" })).not.toBeChecked();
  });
});

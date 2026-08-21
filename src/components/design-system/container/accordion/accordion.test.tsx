// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

function ExampleAccordion() {
  return (
    <Accordion>
      <AccordionItem>
        <AccordionTrigger>補足情報</AccordionTrigger>
        <AccordionContent>必要なときに確認する内容です。</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("native details と summary で詳細を開閉する", async () => {
    render(<ExampleAccordion />);

    const item = screen.getByText("補足情報").closest("details");
    if (item === null) throw new Error("accordion item が見つかりません。");

    expect(item).not.toHaveAttribute("open");
    await userEvent.click(screen.getByText("補足情報"));
    expect(item).toHaveAttribute("open");
  });

  it("複数の項目を初期状態で開ける", () => {
    render(
      <Accordion>
        <AccordionItem open>
          <AccordionTrigger>一つ目</AccordionTrigger>
          <AccordionContent>内容一</AccordionContent>
        </AccordionItem>
        <AccordionItem open>
          <AccordionTrigger>二つ目</AccordionTrigger>
          <AccordionContent>内容二</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(document.querySelectorAll("details[open]")).toHaveLength(2);
  });

  it("hover 時も背景色と文字色のコントラストを保つ", () => {
    render(<ExampleAccordion />);

    expect(screen.getByText("補足情報")).toHaveClass(
      "hover:bg-foreground",
      "hover:text-background",
    );
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ExampleAccordion />);
    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

describe("AccordionItem", () => {
  it("項目 1 件として slot を持つ要素を描画する", () => {
    const { container } = render(<ExampleAccordion />);

    expect(container.querySelector('[data-slot="accordion-item"]')).not.toBeNull();
  });
});

describe("AccordionTrigger", () => {
  it("開閉を切り替える操作として slot を持つ要素を描画する", () => {
    render(<ExampleAccordion />);

    expect(screen.getByText("補足情報")).toHaveAttribute("data-slot", "accordion-trigger");
  });
});

describe("AccordionContent", () => {
  it("内容として slot を持つ要素を描画する", () => {
    render(<ExampleAccordion />);

    expect(screen.getByText("必要なときに確認する内容です。")).toHaveAttribute(
      "data-slot",
      "accordion-content",
    );
  });
});

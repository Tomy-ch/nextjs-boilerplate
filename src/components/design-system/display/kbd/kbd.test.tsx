// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { Kbd, KbdGroup } from "./kbd";

describe("Kbd", () => {
  it("押すキーを kbd 要素として表す", () => {
    render(<Kbd>K</Kbd>);

    const kbd = screen.getByText("K");

    expect(kbd.tagName).toBe("KBD");
    expect(kbd).toHaveAttribute("data-slot", "kbd");
  });

  it("className で見た目を拡張できる", () => {
    render(<Kbd className="tracking-wide">K</Kbd>);

    expect(screen.getByText("K")).toHaveClass("tracking-wide");
  });

  it("group は kbd を入れ子にして一つの入力として表す", () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );

    const group = container.querySelector("[data-slot='kbd-group']");

    expect(group?.tagName).toBe("KBD");
    expect(group?.querySelectorAll("[data-slot='kbd']")).toHaveLength(2);
  });

  it("文中に置いても前後の文言と続けて読み上げられる", () => {
    render(
      <p>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        で検索を開きます。
      </p>,
    );

    expect(screen.getByText(/で検索を開きます。/)).toHaveTextContent("⌘Kで検索を開きます。");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <p>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        で検索を開きます。
      </p>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("KbdGroup", () => {
  // ----- 正常系 -----
  it("複数のキーをまとめる枠として slot を持つ要素を描画する", () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );

    expect(container.querySelector('[data-slot="kbd-group"]')).not.toBeNull();
  });
});

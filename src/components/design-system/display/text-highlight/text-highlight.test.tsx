// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { TextHighlight } from "./text-highlight";

function marksIn(container: HTMLElement): string[] {
  return [...container.querySelectorAll("mark")].map((mark) => mark.textContent ?? "");
}

describe("TextHighlight", () => {
  it("一致した区間だけを mark にし、本文は変えない", () => {
    const text = "検索した語を強調します";
    const { container } = render(<TextHighlight query="強調" text={text} />);

    expect(marksIn(container)).toEqual(["強調"]);
    expect(container.textContent).toBe(text);
  });

  it("一致箇所が複数あるときはすべてを強調する", () => {
    const text = "語と語のあいだ";
    const { container } = render(<TextHighlight query="語" text={text} />);

    expect(marksIn(container)).toEqual(["語", "語"]);
    expect(container.textContent).toBe(text);
  });

  it("本文の先頭と末尾が一致する場合も本文を欠落させない", () => {
    const text = "語のあいだの語";
    const { container } = render(<TextHighlight query="語" text={text} />);

    expect(marksIn(container)).toEqual(["語", "語"]);
    expect(container.textContent).toBe(text);
  });

  it("既定では大文字小文字を区別しない", () => {
    const { container } = render(<TextHighlight query="language" text="Language と language" />);

    expect(marksIn(container)).toEqual(["Language", "language"]);
  });

  it("caseSensitive を指定すると表記が一致する区間だけを強調する", () => {
    const { container } = render(
      <TextHighlight caseSensitive query="Language" text="Language と language" />,
    );

    expect(marksIn(container)).toEqual(["Language"]);
  });

  it("複数の語を渡すと、いずれかに一致した区間を強調する", () => {
    const text = "検索と表記の話";
    const { container } = render(<TextHighlight query={["検索", "表記"]} text={text} />);

    expect(marksIn(container)).toEqual(["検索", "表記"]);
    expect(container.textContent).toBe(text);
  });

  it("語に正規表現の記号を含む場合は文字そのものとして扱う", () => {
    const text = "式 a+b と axb";
    const { container } = render(<TextHighlight query="a+b" text={text} />);

    expect(marksIn(container)).toEqual(["a+b"]);
    expect(container.textContent).toBe(text);
  });

  it("語が空文字のときは強調せず本文をそのまま表示する", () => {
    const text = "そのまま表示する本文";
    const { container } = render(<TextHighlight query="" text={text} />);

    expect(marksIn(container)).toEqual([]);
    expect(container.textContent).toBe(text);
  });

  it("語が空配列のときは強調せず本文をそのまま表示する", () => {
    const text = "そのまま表示する本文";
    const { container } = render(<TextHighlight query={[]} text={text} />);

    expect(marksIn(container)).toEqual([]);
    expect(container.textContent).toBe(text);
  });

  it("一致しないときは強調せず本文をそのまま表示する", () => {
    const text = "そのまま表示する本文";
    const { container } = render(<TextHighlight query="該当なし" text={text} />);

    expect(marksIn(container)).toEqual([]);
    expect(container.textContent).toBe(text);
  });

  it("native span 属性を本文の外枠へ渡す", () => {
    render(<TextHighlight aria-label="検索結果の本文" lang="ja" query="本文" text="本文" />);

    const element = screen.getByLabelText("検索結果の本文");
    expect(element.tagName).toBe("SPAN");
    expect(element).toHaveAttribute("lang", "ja");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <TextHighlight query={["検索", "表記"]} text="検索した語と表記の揺れ" />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

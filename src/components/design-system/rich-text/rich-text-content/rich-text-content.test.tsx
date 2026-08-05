// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SanitizedRichText } from "@/model/rich-text/sanitized-rich-text";

import { RichTextContent } from "./rich-text-content";

function rootOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector("[data-slot='rich-text-content']");
}

describe("RichTextContent", () => {
  it("木のブロック要素を対応する DOM 要素として描画する", () => {
    const { container } = render(
      <RichTextContent
        content={SanitizedRichText.from(
          "<h2>見出し</h2><p>段落</p><ul><li>項目</li></ul><blockquote>引用</blockquote><hr />",
        )}
      />,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("見出し");
    expect(container.querySelector("p")).toHaveTextContent("段落");
    expect(screen.getByRole("listitem")).toHaveTextContent("項目");
    expect(container.querySelector("blockquote")).toHaveTextContent("引用");
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("木のインライン要素を対応する DOM 要素として描画する", () => {
    const { container } = render(
      <RichTextContent
        content={SanitizedRichText.from(
          "<p><strong>強調</strong><em>斜体</em><s>取り消し</s><code>code</code><br /></p>",
        )}
      />,
    );

    expect(container.querySelector("strong")).toHaveTextContent("強調");
    expect(container.querySelector("em")).toHaveTextContent("斜体");
    expect(container.querySelector("s")).toHaveTextContent("取り消し");
    expect(container.querySelector("code")).toHaveTextContent("code");
    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("見出しの階層を木のとおりに保つ", () => {
    render(
      <RichTextContent
        content={SanitizedRichText.from("<h2>大見出し</h2><h3>中見出し</h3><h4>小見出し</h4>")}
      />,
    );

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("中見出し");
    expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("小見出し");
  });

  it("link の href を保ったまま native の a として描画する", () => {
    render(
      <RichTextContent
        content={SanitizedRichText.from('<p><a href="https://example.com/">案内</a></p>')}
      />,
    );

    const link = screen.getByRole("link", { name: "案内" });

    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com/");
  });

  it("組版の起点として typeset を付ける", () => {
    const { container } = render(
      <RichTextContent content={SanitizedRichText.from("<p>本文</p>")} />,
    );

    expect(rootOf(container)).toHaveClass("typeset");
  });

  it("呼び出し元が preset を重ねても typeset は残る", () => {
    const { container } = render(
      <RichTextContent className="typeset-docs" content={SanitizedRichText.from("<p>本文</p>")} />,
    );

    expect(rootOf(container)).toHaveClass("typeset", "typeset-docs");
  });

  it("本文が空のときは空の枠だけを描画する", () => {
    const { container } = render(<RichTextContent content={SanitizedRichText.from("")} />);

    const root = rootOf(container);

    expect(root).toBeInTheDocument();
    expect(root?.textContent).toBe("");
  });

  it("意味論を持たない div として描画し、native 属性を透過する", () => {
    const { container } = render(
      <RichTextContent content={SanitizedRichText.from("<p>本文</p>")} dir="ltr" lang="ja" />,
    );

    const root = rootOf(container);

    expect(root?.tagName).toBe("DIV");
    expect(root).toHaveAttribute("lang", "ja");
    expect(root).toHaveAttribute("dir", "ltr");
  });

  it("アクセシビリティ違反がない", async () => {
    const { container } = render(
      <RichTextContent
        content={SanitizedRichText.from(
          '<h2>見出し</h2><p>本文と<a href="https://example.com/">link</a></p><ul><li>項目</li></ul>',
        )}
      />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

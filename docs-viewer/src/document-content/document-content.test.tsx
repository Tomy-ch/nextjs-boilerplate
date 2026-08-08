// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { SanitizedDocument } from "../sanitize/sanitized-document";
import { DocumentContent } from "./document-content";

describe("DocumentContent", () => {
  // ----- 正常系 -----
  it("木の要素を対応する DOM 要素として描画する", () => {
    render(<DocumentContent content={SanitizedDocument.from("<h2>節</h2><p>本文</p>")} />);

    expect(screen.getByRole("heading", { level: 2, name: "節" })).toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();
  });

  it("表を表として描画する", () => {
    const html =
      "<table><thead><tr><th>見出し</th></tr></thead><tbody><tr><td>値</td></tr></tbody></table>";

    render(<DocumentContent content={SanitizedDocument.from(html)} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "見出し" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "値" })).toBeInTheDocument();
  });

  it("link の href を保つ", () => {
    render(<DocumentContent content={SanitizedDocument.from('<a href="./adr.md">ADR</a>')} />);

    expect(screen.getByRole("link", { name: "ADR" })).toHaveAttribute("href", "./adr.md");
  });

  it("ドキュメント用の組版を既定で当てる", () => {
    const { container } = render(
      <DocumentContent content={SanitizedDocument.from("<p>本文</p>")} />,
    );

    expect(container.querySelector('[data-slot="document-content"]')).toHaveClass(
      "typeset",
      "typeset-docs",
    );
  });

  it("className を重ねても組版の class が残る", () => {
    const { container } = render(
      <DocumentContent className="max-w-prose" content={SanitizedDocument.from("<p>本文</p>")} />,
    );
    const root = container.querySelector('[data-slot="document-content"]');

    expect(root).toHaveClass("typeset", "typeset-docs", "max-w-prose");
  });

  it("native div 属性を外枠へ渡す", () => {
    const { container } = render(
      <DocumentContent content={SanitizedDocument.from("<p>本文</p>")} lang="en" />,
    );

    expect(container.querySelector('[data-slot="document-content"]')).toHaveAttribute("lang", "en");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <DocumentContent content={SanitizedDocument.from("<h2>節</h2><p>本文</p>")} />,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
  // ----- 異常系 -----
  it("本文が空の場合は空の枠を描画する", () => {
    const { container } = render(<DocumentContent content={SanitizedDocument.from("")} />);

    expect(container.querySelector('[data-slot="document-content"]')?.childNodes).toHaveLength(0);
  });
});

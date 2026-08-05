// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { ContentContainer } from "./content-container";

describe("ContentContainer", () => {
  it("読み幅を絞り、中央へ寄せる", () => {
    render(<ContentContainer>本文</ContentContainer>);

    const container = document.querySelector("[data-slot='content-container']");

    expect(container).toHaveClass("mx-auto");
    expect(container?.className).toMatch(/max-w-/);
  });

  it("左右余白を所有する", () => {
    render(<ContentContainer>本文</ContentContainer>);

    expect(document.querySelector("[data-slot='content-container']")?.className).toMatch(
      /(^|\s)px-/,
    );
  });

  it("main を描画せず、置かれた場所の内側だけを担う", () => {
    render(
      <main>
        <ContentContainer>本文</ContentContainer>
      </main>,
    );

    const container = document.querySelector("[data-slot='content-container']");

    expect(container?.tagName).toBe("DIV");
    expect(container?.parentElement?.tagName).toBe("MAIN");
    expect(document.querySelectorAll("main")).toHaveLength(1);
  });

  it("呼び出し元の className を受け付ける", () => {
    render(<ContentContainer className="py-8">本文</ContentContainer>);

    expect(document.querySelector("[data-slot='content-container']")).toHaveClass("py-8");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<ContentContainer>本文</ContentContainer>);

    expect(
      (
        await axe(container, {
          rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});

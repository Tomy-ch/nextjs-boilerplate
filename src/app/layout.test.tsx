import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  // ----- 正常系 -----
  it("HTML の言語と子要素を設定する", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>テスト用コンテンツ</p>
      </RootLayout>,
    );

    expect(markup).toContain('<html lang="ja"');
    expect(markup).toContain("テスト用コンテンツ");
  });

  it("横断通知の Provider を配下へ供給する", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>テスト用コンテンツ</p>
      </RootLayout>,
    );

    expect(markup).toContain('aria-live="polite"');
  });
});

describe("metadata", () => {
  // ----- 正常系 -----
  it("各 route が差分だけを宣言できるよう、タイトルの雛形を置く", () => {
    expect(metadata.title).toMatchObject({
      default: "nextjs-boilerplate",
      template: "%s | nextjs-boilerplate",
    });
    expect(metadata.description).toBeTypeOf("string");
  });
});

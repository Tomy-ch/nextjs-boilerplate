import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist_Mono: () => ({ variable: "--typeface-geist-mono" }),
  IBM_Plex_Sans_JP: () => ({ variable: "--typeface-plex-jp" }),
  Michroma: () => ({ variable: "--typeface-michroma" }),
  LINE_Seed_JP: () => ({ variable: "--typeface-line-seed" }),
}));

import RootLayout, { metadata } from "./layout";

describe("RootLayout", () => {
  it("HTML の言語と子要素を設定する", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>テスト用コンテンツ</p>
      </RootLayout>,
    );

    expect(markup).toContain('<html lang="ja"');
    expect(markup).toContain("テスト用コンテンツ");
  });

  it("書体の変数を配る class を html へ載せる", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>テスト用コンテンツ</p>
      </RootLayout>,
    );

    const htmlClass = /<html[^>]*class="([^"]*)"/.exec(markup)?.[1] ?? "";

    for (const variable of [
      "--typeface-michroma",
      "--typeface-line-seed",
      "--typeface-plex-jp",
      "--typeface-geist-mono",
    ]) {
      expect(htmlClass).toContain(variable);
    }
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

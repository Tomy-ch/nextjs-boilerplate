import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist_Mono: () => ({ variable: "--typeface-geist-mono" }),
  Michroma: () => ({ variable: "--typeface-michroma" }),
}));
// 計装は router の文脈と計測器を要求する。器が何を mount しているかはここの観点ではないので、
// 供給だけを差し替える（計装そのものは telemetry.test.tsx が持つ）。
vi.mock("next/navigation", () => ({ usePathname: () => "/", useParams: () => ({}) }));
vi.mock("next/web-vitals", () => ({ useReportWebVitals: () => undefined }));
// 同意の島はサーバ側で何も描かない。器が置いていることを見るために、描くものへ差し替える
// （島そのものの振る舞いは `consent.test.tsx` が持つ）。
vi.mock("./consent", () => ({ Consent: () => <div data-slot="consent-island" /> }));

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

    for (const variable of ["--typeface-michroma", "--typeface-geist-mono"]) {
      expect(htmlClass).toContain(variable);
    }
  });

  it("配る書体はラテンの 2 つだけで、和文の Web フォントは持たない", () => {
    // 和文書体を `next/font` で読むと、番号付きスライスの @font-face が全て、描画をブロックする
    // CSS として載る。増やすならその費用を測り直すこと（0051 §5）。
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>テスト用コンテンツ</p>
      </RootLayout>,
    );

    const htmlClass = /<html[^>]*class="([^"]*)"/.exec(markup)?.[1] ?? "";

    expect(htmlClass.match(/--typeface-[a-z-]+/g)).toEqual([
      "--typeface-michroma",
      "--typeface-geist-mono",
    ]);
  });

  it("同意の島を器へ置く", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <p>テスト用コンテンツ</p>
      </RootLayout>,
    );

    expect(markup).toContain("consent-island");
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

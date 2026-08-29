import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist_Mono: () => ({ variable: "--typeface-geist-mono" }),
  Michroma: () => ({ variable: "--typeface-michroma" }),
}));
// 計装は router の文脈と計測器を要求する。器が何を mount しているかはここの観点ではないので、
// 供給だけを差し替える（計装そのものは telemetry.test.tsx が持つ）。
vi.mock("next/navigation", () => ({ usePathname: () => "/", useParams: () => ({}) }));
vi.mock("next/web-vitals", () => ({ useReportWebVitals: () => undefined }));

const site = vi.hoisted(() => ({ publicOrigin: "https://www.example.test", isIndexable: false }));

vi.mock("@/config/site/site.server", () => ({ getSiteConfig: () => site }));

import RootLayout, { metadata } from "./layout";

/** 土台は module の評価時に決まるため、設定を変えたら読み直す。 */
async function reloadMetadata() {
  vi.resetModules();

  return (await import("./layout")).metadata;
}

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
  beforeEach(() => {
    site.publicOrigin = "https://www.example.test";
    site.isIndexable = false;
  });

  // ----- 正常系 -----
  it("各 route が差分だけを宣言できるよう、タイトルの雛形を置く", () => {
    expect(metadata.title).toMatchObject({
      default: "nextjs-boilerplate",
      template: "%s | nextjs-boilerplate",
    });
    expect(metadata.description).toBeTypeOf("string");
  });

  it("絶対 URL の土台に、外から見た origin を置く", () => {
    expect(metadata.metadataBase).toEqual(new URL("https://www.example.test"));
  });

  it("正規 URL は土台に置かない", () => {
    expect(metadata.alternates).toBeUndefined();
  });

  it("索引させない環境では noindex を土台に置く", async () => {
    expect((await reloadMetadata()).robots).toEqual({ index: false, follow: false });
  });

  it("索引させる環境では robots を宣言せず、画面ごとの宣言に委ねる", async () => {
    site.isIndexable = true;

    expect((await reloadMetadata()).robots).toBeUndefined();
  });
});

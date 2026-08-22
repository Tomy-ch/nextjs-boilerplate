import { describe, expect, it } from "vitest";

import {
  findUnresolvedAssets,
  formatUnresolvedAssets,
  isCatalogOnly,
  parseStaticDirs,
} from "./catalog-assets";

const ROOT = process.cwd();

/** 実物の配信の根。アプリ側と、カタログだけが持つ側の両方を含む。 */
const CATALOG_ROOTS = ["public", ".storybook/public"];

describe("parseStaticDirs", () => {
  // ----- 正常系 -----
  it("カタログの設定からの相対を、リポジトリ相対の根へ直す", () => {
    const source = 'staticDirs: ["../public", "./public"],';

    expect(parseStaticDirs(source)).toEqual(["public", ".storybook/public"]);
  });

  it("根が増えても、並んだぶんだけ返す", () => {
    const source = 'staticDirs: ["../public", "./public", "../docs/assets"],';

    expect(parseStaticDirs(source)).toEqual(["public", ".storybook/public", "docs/assets"]);
  });

  // ----- 異常系 -----
  it("宣言そのものが無ければ例外を投げる", () => {
    expect(() => parseStaticDirs("const config = {};")).toThrow("staticDirs");
  });

  it("宣言が空なら例外を投げる", () => {
    expect(() => parseStaticDirs("staticDirs: [],")).toThrow("空です");
  });
});

describe("isCatalogOnly", () => {
  // ----- 正常系 -----
  it("カタログ自身の module はカタログ側と見る", () => {
    expect(isCatalogOnly(".storybook/lib/sample-asset.ts")).toBe(true);
  });

  it("story はカタログ側と見る", () => {
    expect(isCatalogOnly("src/components/design-system/display/avatar/avatar.stories.tsx")).toBe(
      true,
    );
  });

  it("アプリの module はアプリ側と見る", () => {
    expect(isCatalogOnly("src/model/media.ts")).toBe(false);
  });

  it("story だけが読む fixture もアプリ側と見る", () => {
    expect(isCatalogOnly("src/features/x/x.fixture.ts")).toBe(false);
  });
});

describe("findUnresolvedAssets", () => {
  // ----- 正常系 -----
  it("アプリの配信の根に実体がある URL は拾わない", () => {
    const source = 'export const NO_IMAGE_URL = "/no-image.svg";';

    expect(findUnresolvedAssets("src/model/media.ts", source, ROOT, CATALOG_ROOTS)).toEqual([]);
  });

  it("カタログだけが持つ資材を、story から指すのは拾わない", () => {
    const source = 'const src = "/sample-item-1.svg";';

    expect(findUnresolvedAssets("src/x/y.stories.tsx", source, ROOT, CATALOG_ROOTS)).toEqual([]);
  });

  it("拡張子が資材のものでなければ見ない", () => {
    const source = 'const path = "/api/status";';

    expect(findUnresolvedAssets("src/x/y.ts", source, ROOT, CATALOG_ROOTS)).toEqual([]);
  });

  it("組み立てた URL は見ない", () => {
    const source = `const src = \`/items/\${id}.png\`;`;

    expect(findUnresolvedAssets("src/x/y.ts", source, ROOT, CATALOG_ROOTS)).toEqual([]);
  });

  it("解決しないことが正しいと宣言された参照は拾わない", () => {
    const file = "src/components/design-system/display/avatar/avatar.stories.tsx";
    const source = '<AvatarImage alt="" src="/存在しない画像.png" />';

    expect(findUnresolvedAssets(file, source, ROOT, CATALOG_ROOTS)).toEqual([]);
  });

  // ----- 異常系 -----
  it("配信の根に実体が無い URL を、行番号とともに返す", () => {
    const source = `\nconst src = "${"/nope"}.svg";`;

    expect(findUnresolvedAssets("src/x/y.stories.tsx", source, ROOT, CATALOG_ROOTS)).toEqual([
      { file: "src/x/y.stories.tsx", line: 2, url: "/nope.svg", reason: "missing" },
    ]);
  });

  it("カタログだけが持つ資材を、アプリの module から指すのは拾う", () => {
    const source = 'const src = "/sample-item-1.svg";';

    expect(findUnresolvedAssets("src/model/media.ts", source, ROOT, CATALOG_ROOTS)).toEqual([
      { file: "src/model/media.ts", line: 1, url: "/sample-item-1.svg", reason: "missing" },
    ]);
  });

  it("`/src/...` は配信の根へ写されないので拾う", () => {
    const url = `/src${"/components/design-system/display/media-image/invertocat.png"}`;
    const source = `const src = "${url}";`;

    expect(findUnresolvedAssets("src/x/y.stories.tsx", source, ROOT, CATALOG_ROOTS)).toEqual([
      { file: "src/x/y.stories.tsx", line: 1, url, reason: "source-path" },
    ]);
  });

  it("同じ行に複数あればすべて返す", () => {
    const source = `const a = "${"/nope-a"}.png", b = "${"/nope-b"}.png";`;

    expect(findUnresolvedAssets("src/x/y.stories.tsx", source, ROOT, CATALOG_ROOTS)).toHaveLength(
      2,
    );
  });
});

describe("formatUnresolvedAssets", () => {
  // ----- 正常系 -----
  it("何も無ければ空文字を返す", () => {
    expect(formatUnresolvedAssets([])).toBe("");
  });

  it("理由ごとに、直し方の分かる文言を添えて 1 行にする", () => {
    const formatted = formatUnresolvedAssets([
      { file: "src/x/y.stories.tsx", line: 2, url: "/nope.svg", reason: "missing" },
      { file: "src/x/z.stories.tsx", line: 9, url: "/src/a.png", reason: "source-path" },
    ]);

    expect(formatted).toBe(
      [
        "src/x/y.stories.tsx:2: /nope.svg — 配信の根に実体がありません",
        "src/x/z.stories.tsx:9: /src/a.png — `/src/...` は dev サーバでしか解決しません。資材を配信の根へ置いてください",
      ].join("\n"),
    );
  });
});

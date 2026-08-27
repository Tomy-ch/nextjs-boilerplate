import { describe, expect, it } from "vitest";

import { semanticColorTokens, semanticNonColorTokens } from "./theme-tokens";

const CSS = `
@theme {
  --color-neutral-100: #ededed;
  --color-background: var(--semantic-color-background);
  --color-foreground: var(--semantic-color-foreground);
  --font-sans: var(--semantic-font-sans);
  --font-weight-emphasis: var(--semantic-font-weight-emphasis);
  --shadow-glow-primary: var(--semantic-shadow-glow-primary);
  --text-shadow-glow: var(--semantic-text-shadow-glow);
}
:root {
  color-scheme: light;
  --semantic-color-background: var(--color-neutral-100);
}
`;

describe("semanticColorTokens", () => {
  // ----- 正常系 -----
  it("意味トークンの名前を並べる", () => {
    expect(semanticColorTokens(CSS)).toEqual([
      "--semantic-color-background",
      "--semantic-color-foreground",
    ]);
  });

  it("primitive の宣言を拾わない", () => {
    expect(semanticColorTokens(CSS)).not.toContain("--color-neutral-100");
  });

  it("別名そのものではなく、別名が指す実体の名前を返す", () => {
    // 別名は `:root` で解決済みで、系統を切り替えた部分木では再解決されない。
    // 別名を読むと、再束縛が届いていても値が変わらず見える。
    expect(semanticColorTokens(CSS)).not.toContain("--color-background");
  });

  // ----- 異常系 -----
  it("1 つも無ければ落とす", () => {
    expect(() => semanticColorTokens(":root { color-scheme: light; }")).toThrow();
  });
});

describe("semanticNonColorTokens", () => {
  // ----- 正常系 -----
  it("色以外の意味トークンを、読み取りに使うプロパティとともに並べる", () => {
    expect(semanticNonColorTokens(CSS)).toEqual([
      { name: "--semantic-font-sans", property: "fontFamily" },
      { name: "--semantic-font-weight-emphasis", property: "fontWeight" },
      { name: "--semantic-shadow-glow-primary", property: "boxShadow" },
      { name: "--semantic-text-shadow-glow", property: "textShadow" },
    ]);
  });

  it("配色の別名を拾わない", () => {
    expect(semanticNonColorTokens(CSS).map((probe) => probe.name)).not.toContain(
      "--semantic-color-background",
    );
  });

  // ----- 異常系 -----
  it("1 つも無ければ落とす", () => {
    expect(() => semanticNonColorTokens(":root { color-scheme: light; }")).toThrow();
  });
});

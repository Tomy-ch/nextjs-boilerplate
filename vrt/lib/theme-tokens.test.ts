import { describe, expect, it } from "vitest";

import { semanticColorTokens } from "./theme-tokens";

const CSS = `
@theme {
  --color-neutral-100: #ededed;
  --color-background: var(--semantic-color-background);
  --color-foreground: var(--semantic-color-foreground);
}
:root {
  color-scheme: light;
  --semantic-color-background: var(--color-neutral-100);
}
`;

describe("semanticColorTokens", () => {
  // ----- 正常系 -----
  it("意味トークンの名前を並べる", () => {
    expect(semanticColorTokens(CSS)).toEqual(["--color-background", "--color-foreground"]);
  });

  it("primitive の宣言を拾わない", () => {
    expect(semanticColorTokens(CSS)).not.toContain("--color-neutral-100");
  });

  it("意味トークンの実体の宣言を拾わない", () => {
    expect(semanticColorTokens(CSS)).not.toContain("--semantic-color-background");
  });

  // ----- 異常系 -----
  it("1 つも無ければ落とす", () => {
    expect(() => semanticColorTokens(":root { color-scheme: light; }")).toThrow();
  });
});

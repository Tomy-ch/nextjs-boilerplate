import { describe, expect, it } from "vitest";
import { generateTokensCss } from "./gen-tokens";

describe("generateTokensCss", () => {
  it("primitive と semantic token を Tailwind v4 の theme CSS に変換する", () => {
    const css = generateTokensCss(
      {
        color: { neutral: { 0: { $type: "color", $value: "#ffffff" } } },
        font: { sans: { $type: "fontFamily", $value: ["Arial", "sans-serif"] } },
      },
      {
        theme: {
          light: { color: { background: { $type: "color", $value: "{color.neutral.0}" } } },
          dark: { color: { background: { $type: "color", $value: "#000000" } } },
        },
      },
    );

    expect(css).toContain("--color-neutral-0: #ffffff;");
    expect(css).toContain("--font-sans: Arial, sans-serif;");
    expect(css).toContain("--color-background: var(--semantic-color-background);");
    expect(css).toContain("--semantic-color-background: var(--color-neutral-0);");
    expect(css).toContain("@media screen and (prefers-color-scheme: dark)");
  });

  it("小数を含む段の名前を CSS の ident として綴れるようにエスケープする", () => {
    const css = generateTokensCss(
      { spacing: { "0.5": { $type: "dimension", $value: "0.125rem" } } },
      {
        theme: { light: { spacing: { gutter: { $type: "dimension", $value: "{spacing.0.5}" } } } },
      },
    );

    expect(css).toContain(String.raw`--spacing-0\.5: 0.125rem;`);
    expect(css).toContain(String.raw`--semantic-spacing-gutter: var(--spacing-0\.5);`);
  });

  it("宣言されていない primitive を参照している token を拒否する", () => {
    expect(() =>
      generateTokensCss(
        { color: { neutral: { 0: { $type: "color", $value: "#ffffff" } } } },
        { theme: { light: { color: { bg: { $type: "color", $value: "{color.neutral.9}" } } } } },
      ),
    ).toThrow("token 参照 {color.neutral.9} に対応する primitive がありません");
  });

  it("既定以外の theme を screen に限定し、印刷は既定の配色にする", () => {
    const css = generateTokensCss(
      {
        color: {
          neutral: {
            0: { $type: "color", $value: "#ffffff" },
            950: { $type: "color", $value: "#0a0a0a" },
          },
        },
      },
      {
        theme: {
          light: { color: { background: { $type: "color", $value: "{color.neutral.0}" } } },
          dark: { color: { background: { $type: "color", $value: "{color.neutral.950}" } } },
        },
      },
    );

    expect(css).not.toMatch(/@media \(prefers-color-scheme/);
    expect(css).toContain('@media screen {\n  :root[data-theme="dark"]');
  });
});

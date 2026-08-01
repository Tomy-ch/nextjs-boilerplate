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
    expect(css).toContain("@media (prefers-color-scheme: dark)");
  });
});

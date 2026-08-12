import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mkdir, readFile, writeFile } = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ mkdir, readFile, writeFile }));

import { generateBreakpointTs, generateOrCheckTokens, generateTokensCss } from "./gen-tokens";

const primitives = {
  color: { neutral: { 0: { $type: "color", $value: "#ffffff" } } },
  breakpoint: {
    lg: { $type: "dimension", $value: "64rem" },
    "2xl": { $type: "dimension", $value: "96rem" },
  },
};
const themes = {
  theme: {
    light: { color: { background: { $type: "color", $value: "{color.neutral.0}" } } },
  },
};

/** 読み込むパスに応じて token SSOT を返す。 */
const fileOf = (path: string) => (path.endsWith("primitives.json") ? primitives : themes);

/** 読み込むパスに応じて、SSOT と一致する生成物または SSOT そのものを返す。 */
const generatedOf = (path: string): string => {
  if (path.endsWith(".css")) {
    return generateTokensCss(primitives, themes);
  }

  return path.endsWith("breakpoint.ts")
    ? generateBreakpointTs(primitives)
    : JSON.stringify(fileOf(path));
};

beforeEach(() => {
  mkdir.mockResolvedValue(undefined);
  writeFile.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.resetAllMocks();
});

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

  it("配色の切替と同じ条件で color-scheme を宣言する", () => {
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

    expect(css).toContain(":root {\n  color-scheme: light;");
    expect(css).toContain(
      '@media screen and (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;',
    );
    expect(css).toContain('@media screen {\n  :root[data-theme="dark"] {\n    color-scheme: dark;');
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

  it("既定の theme を欠いた定義を拒否する", () => {
    expect(() =>
      generateTokensCss(
        { color: { neutral: { 0: { $type: "color", $value: "#ffffff" } } } },
        {
          theme: {
            dark: { color: { background: { $type: "color", $value: "{color.neutral.0}" } } },
          },
        },
      ),
    ).toThrow('既定の theme "light" が themes.json にありません');
  });
});

describe("generateOrCheckTokens", () => {
  // ----- 正常系 -----
  it("生成では出力先を作ってから CSS と breakpoint を書き出す", async () => {
    readFile.mockImplementation(async (path: string) => JSON.stringify(fileOf(path)));

    await generateOrCheckTokens(false);

    expect(mkdir).toHaveBeenCalledTimes(2);
    expect(writeFile.mock.calls[0]?.[1]).toContain("--color-neutral-0");
    expect(writeFile.mock.calls[1]?.[1]).toContain("export const BREAKPOINT");
  });

  it("検査では生成物が SSOT と一致していれば何も投げない", async () => {
    readFile.mockImplementation(async (path: string) => generatedOf(path));

    await expect(generateOrCheckTokens(true)).resolves.toBeUndefined();
    expect(writeFile).not.toHaveBeenCalled();
  });

  // ----- 異常系 -----
  it("検査で CSS が SSOT と一致しなければ再生成を促して落とす", async () => {
    readFile.mockImplementation(async (path: string) =>
      path.endsWith(".css") ? "/* 古い生成物 */" : generatedOf(path),
    );

    await expect(generateOrCheckTokens(true)).rejects.toThrow(
      "design token の生成物が SSOT と一致しません。pnpm gen:tokens を実行してください。",
    );
  });

  it("検査で breakpoint が SSOT と一致しなければ再生成を促して落とす", async () => {
    readFile.mockImplementation(async (path: string) =>
      path.endsWith("breakpoint.ts") ? "// 古い生成物\n" : generatedOf(path),
    );

    await expect(generateOrCheckTokens(true)).rejects.toThrow(
      "design token の生成物が SSOT と一致しません。pnpm gen:tokens を実行してください。",
    );
  });
});

describe("generateBreakpointTs", () => {
  // ----- 正常系 -----
  it("段の名前と幅を定数として出す", () => {
    const generated = generateBreakpointTs(primitives);

    expect(generated).toContain("export const BREAKPOINT");
    expect(generated).toContain('lg: "64rem",');
  });

  it("識別子として妥当でない名前だけ引用符を付ける", () => {
    expect(generateBreakpointTs(primitives)).toContain('"2xl": "96rem",');
  });

  it("手編集を禁じる断り書きを先頭に置く", () => {
    expect(generateBreakpointTs(primitives).startsWith("// このファイルは")).toBe(true);
  });

  // ----- 異常系 -----
  it("breakpoint の段が無ければ落とす", () => {
    expect(() => generateBreakpointTs({ color: {} })).toThrow(
      "primitives.json に breakpoint の段がありません",
    );
  });
});

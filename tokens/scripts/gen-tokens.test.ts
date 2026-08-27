import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mkdir, readdir, readFile, writeFile } = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ mkdir, readdir, readFile, writeFile }));

import {
  generateBreakpointTs,
  generateDesignTokenTs,
  generateOrCheckTokens,
  generateTokensCss,
  type Surface,
} from "./gen-tokens";

const color = (value: string) => ({ $type: "color", $value: value });

const primitives = {
  color: {
    neutral: { 0: color("#ffffff"), 950: color("#0a0a0a") },
  },
  breakpoint: {
    lg: { $type: "dimension", $value: "64rem" },
    "2xl": { $type: "dimension", $value: "96rem" },
  },
};

const tokensOf = {
  "user/light": { color: { background: color("{color.neutral.0}") } },
  "user/dark": { color: { background: color("{color.neutral.950}") } },
  "admin/light": { color: { background: color("{color.neutral.950}") } },
  "admin/dark": { color: { background: color("#000000") } },
  "support/light": { color: { background: color("{color.neutral.0}") } },
  "support/dark": { color: { background: color("{color.neutral.950}") } },
};

const surfaces: Surface[] = [
  {
    name: "user",
    schemes: [
      { name: "light", tokens: tokensOf["user/light"] },
      { name: "dark", tokens: tokensOf["user/dark"] },
    ],
  },
  {
    name: "admin",
    schemes: [
      { name: "light", tokens: tokensOf["admin/light"] },
      { name: "dark", tokens: tokensOf["admin/dark"] },
    ],
  },
];

/** 読み込むパスに応じて token SSOT を返す。 */
const fileOf = (path: string) => {
  if (path.endsWith("primitives.json")) return primitives;

  const key = path.replace(/^.*themes\//, "").replace(/\.json$/, "");

  return tokensOf[key as keyof typeof tokensOf];
};

/** 読み込むパスに応じて、SSOT と一致する生成物または SSOT そのものを返す。 */
const generatedOf = (path: string): string => {
  if (path.endsWith(".css")) {
    return generateTokensCss(primitives, surfaces);
  }

  if (path.endsWith("breakpoint.ts")) return generateBreakpointTs(primitives);
  if (path.endsWith("design-token.ts")) return generateDesignTokenTs(primitives, surfaces);

  return JSON.stringify(fileOf(path));
};

/** `tokens/themes` の走査に、系統 2 つと配色 2 つを返す。系統は既定でない側を先に返す。 */
const listSurfaces = (surfaceNames: readonly string[], schemeNames: readonly string[]) => {
  readdir.mockImplementation(async (_path: string, options?: unknown) =>
    options === undefined
      ? schemeNames.map((name) => `${name}.json`)
      : surfaceNames.map((name) => ({ name, isDirectory: () => true })),
  );
};

beforeEach(() => {
  mkdir.mockResolvedValue(undefined);
  writeFile.mockResolvedValue(undefined);
  listSurfaces(["admin", "user"], ["dark", "light"]);
  readFile.mockImplementation(async (path: string) => JSON.stringify(fileOf(path)));
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("generateTokensCss", () => {
  // ----- 正常系 -----
  it("primitive と semantic token を Tailwind v4 の theme CSS に変換する", () => {
    const css = generateTokensCss(
      {
        color: { neutral: { 0: color("#ffffff"), 950: color("#0a0a0a") } },
        font: { sans: { $type: "fontFamily", $value: ["Arial", "sans-serif"] } },
      },
      surfaces.slice(0, 1),
    );

    expect(css).toContain("--color-neutral-0: #ffffff;");
    expect(css).toContain("--font-sans: Arial, sans-serif;");
    expect(css).toContain("--color-background: var(--semantic-color-background);");
    expect(css).toContain("--semantic-color-background: var(--color-neutral-0);");
    expect(css).toContain("@media screen and (prefers-color-scheme: dark)");
  });

  it("値の一部に埋まった参照を、1 つの値の中に何個あっても解決する", () => {
    const css = generateTokensCss(primitives, [
      {
        name: "user",
        schemes: [
          {
            name: "light",
            tokens: {
              shadow: {
                glow: {
                  $type: "shadow",
                  $value: "0 0 4px {color.neutral.0}, 0 0 8px {color.neutral.950}",
                },
              },
            },
          },
        ],
      },
    ]);

    expect(css).toContain(
      "--semantic-shadow-glow: 0 0 4px var(--color-neutral-0), 0 0 8px var(--color-neutral-950);",
    );
  });

  it("小数を含む段の名前を CSS の ident として綴れるようにエスケープする", () => {
    const css = generateTokensCss(
      { spacing: { "0.5": { $type: "dimension", $value: "0.125rem" } } },
      [
        {
          name: "user",
          schemes: [
            {
              name: "light",
              tokens: { spacing: { gutter: { $type: "dimension", $value: "{spacing.0.5}" } } },
            },
          ],
        },
      ],
    );

    expect(css).toContain(String.raw`--spacing-0\.5: 0.125rem;`);
    expect(css).toContain(String.raw`--semantic-spacing-gutter: var(--spacing-0\.5);`);
  });

  it("配色の切替と同じ条件で color-scheme を宣言する", () => {
    const css = generateTokensCss(primitives, surfaces);

    expect(css).toContain(":root {\n  color-scheme: light;");
    expect(css).toContain(
      '@media screen and (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;',
    );
    expect(css).toContain('@media screen {\n  :root[data-theme="dark"] {\n    color-scheme: dark;');
  });

  it("既定以外の配色を screen に限定し、印刷は既定の配色にする", () => {
    const css = generateTokensCss(primitives, surfaces);

    expect(css).not.toMatch(/@media \(prefers-color-scheme/);
    expect(css).toContain('@media screen {\n  :root[data-theme="dark"]');
  });

  it("既定以外の系統を data-surface の部分木へ出す", () => {
    const css = generateTokensCss(primitives, surfaces);

    expect(css).toContain(
      '[data-surface="admin"] {\n  --semantic-color-background: var(--color-neutral-950);',
    );
    expect(css).toContain(
      '@media screen and (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) [data-surface="admin"] {',
    );
    expect(css).toContain('@media screen {\n  :root[data-theme="dark"] [data-surface="admin"] {');
  });

  it("既定の配色の系統を :root へ繋がず属性だけで出す", () => {
    const css = generateTokensCss(primitives, surfaces);

    expect(css).not.toContain(':root [data-surface="admin"]');
  });

  it("系統には color-scheme を出さず、配色の側だけが宣言する", () => {
    const css = generateTokensCss(primitives, surfaces);
    const blocks = css.split(/(?=^\[data-surface|^:root|^@media)/m);
    const surfaceBlocks = blocks.filter((block) => block.includes('[data-surface="admin"]'));
    const schemeBlocks = blocks.filter(
      (block) => block.includes(":root") && !block.includes("[data-surface"),
    );

    expect(surfaceBlocks).not.toHaveLength(0);
    for (const block of surfaceBlocks) expect(block).not.toMatch(/^\s*color-scheme:/m);
    for (const block of schemeBlocks) expect(block).toMatch(/^\s*color-scheme:/m);
  });

  it("既定の系統を先に出し、あとに来る系統が同じ木で勝つようにする", () => {
    const css = generateTokensCss(primitives, surfaces);

    expect(css.indexOf(":root {")).toBeLessThan(css.indexOf('[data-surface="admin"]'));
  });

  // ----- 異常系 -----
  it("宣言されていない primitive を参照している token を拒否する", () => {
    expect(() =>
      generateTokensCss({ color: { neutral: { 0: color("#ffffff") } } }, [
        {
          name: "user",
          schemes: [{ name: "light", tokens: { color: { bg: color("{color.neutral.9}") } } }],
        },
      ]),
    ).toThrow("token 参照 {color.neutral.9} に対応する primitive がありません");
  });

  it("系統が 1 つも無い定義を拒否する", () => {
    expect(() => generateTokensCss(primitives, [])).toThrow(
      '既定の系統 "user" が tokens/themes にありません',
    );
  });

  it("系統はあるが配色を 1 つも持たない定義を拒否する", () => {
    expect(() => generateTokensCss(primitives, [{ name: "user", schemes: [] }])).toThrow(
      '既定の系統 "user" が tokens/themes にありません',
    );
  });
});

describe("generateOrCheckTokens", () => {
  // ----- 正常系 -----
  it("生成では出力先を作ってから CSS と breakpoint を書き出す", async () => {
    await generateOrCheckTokens(false);

    expect(mkdir).toHaveBeenCalledTimes(3);
    const written = writeFile.mock.calls.map((call) => String(call[1]));

    expect(written.some((content) => content.includes("--color-neutral-0"))).toBe(true);
    expect(written.some((content) => content.includes("export const BREAKPOINT"))).toBe(true);
    expect(written.some((content) => content.includes("export const SEMANTIC_TOKEN"))).toBe(true);
  });

  it("走査した系統と配色を、既定の側を先頭にして並べる", async () => {
    await generateOrCheckTokens(false);
    const css = String(writeFile.mock.calls.find((call) => String(call[1]).includes(":root"))?.[1]);

    expect(css.indexOf(":root {")).toBeLessThan(css.indexOf('[data-surface="admin"]'));
  });

  it("既定でない系統どうしを名前順に並べる", async () => {
    listSurfaces(["user", "support", "admin"], ["light", "dark"]);

    await generateOrCheckTokens(false);
    const css = String(writeFile.mock.calls.find((call) => String(call[1]).includes(":root"))?.[1]);

    expect(css.indexOf('[data-surface="admin"]')).toBeLessThan(
      css.indexOf('[data-surface="support"]'),
    );
  });

  it("json 以外の入り込みを配色として読まない", async () => {
    listSurfaces(["user"], ["light", "dark"]);
    readdir.mockImplementation(async (_path: string, options?: unknown) =>
      options === undefined
        ? ["light.json", "dark.json", "README.md"]
        : [{ name: "user", isDirectory: () => true }],
    );

    await generateOrCheckTokens(false);

    // 読んだのは primitives と配色 2 枚だけ。resolve するかどうかでは、混入を読んでいても判らない
    expect(readFile.mock.calls.map((call) => String(call[0]))).toHaveLength(3);
    expect(String(writeFile.mock.calls[0]?.[1])).not.toContain("README");
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

  it("検査で token の目録が SSOT と一致しなければ再生成を促して落とす", async () => {
    readFile.mockImplementation(async (path: string) =>
      path.endsWith("design-token.ts") ? "// 古い生成物\n" : generatedOf(path),
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

  it("系統が 1 つも無い配置を拒否する", async () => {
    listSurfaces([], []);

    await expect(generateOrCheckTokens(false)).rejects.toThrow(
      '既定の系統 "user" が tokens/themes にありません',
    );
  });

  it("既定の系統を欠いた配置を拒否する", async () => {
    listSurfaces(["admin"], ["light", "dark"]);

    await expect(generateOrCheckTokens(false)).rejects.toThrow(
      '既定の系統 "user" が tokens/themes にありません',
    );
  });

  it("配色が 1 つも無い系統を拒否する", async () => {
    listSurfaces(["user"], []);

    await expect(generateOrCheckTokens(false)).rejects.toThrow(
      '既定の配色 "light" が tokens/themes/user にありません',
    );
  });

  it("既定の配色を欠いた系統を拒否する", async () => {
    listSurfaces(["user"], ["dark"]);

    await expect(generateOrCheckTokens(false)).rejects.toThrow(
      '既定の配色 "light" が tokens/themes/user にありません',
    );
  });

  it("既定でない系統が配色を欠いた配置を拒否する", async () => {
    readdir.mockImplementation(async (path: string, options?: unknown) => {
      if (options !== undefined) {
        return ["admin", "user"].map((name) => ({ name, isDirectory: () => true }));
      }

      return path.endsWith("admin") ? ["dark.json"] : ["light.json", "dark.json"];
    });

    await expect(generateOrCheckTokens(false)).rejects.toThrow(
      "tokens/themes/admin の配色が user と一致しません（light,dark が要ります）",
    );
  });

  it("系統の走査で非ディレクトリの入り込みを無視する", async () => {
    readdir.mockImplementation(async (_path: string, options?: unknown) =>
      options === undefined
        ? ["light.json", "dark.json"]
        : [
            { name: "README.md", isDirectory: () => false },
            { name: "user", isDirectory: () => true },
          ],
    );

    await generateOrCheckTokens(false);

    expect(String(writeFile.mock.calls[0]?.[1])).not.toContain("README");
  });

  it("系統や配色ごとに宣言する token が違う配置を拒否する", async () => {
    readFile.mockImplementation(async (path: string) =>
      path.includes("admin/dark") ? JSON.stringify({ color: {} }) : JSON.stringify(fileOf(path)),
    );

    await expect(generateOrCheckTokens(false)).rejects.toThrow(
      "tokens/themes/admin/dark.json の token が user/light.json と一致しません",
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

  it("breakpoint が段ではなく単一の値として書かれていれば落とす", () => {
    expect(() =>
      generateBreakpointTs({ breakpoint: { $type: "dimension", $value: "1rem" } }),
    ).toThrow("primitives.json に breakpoint の段がありません");
  });
});

describe("generateDesignTokenTs", () => {
  // ----- 正常系 -----
  it("意味トークンと生スケールの名前を、群ごとに出す", () => {
    const generated = generateDesignTokenTs(primitives, surfaces);

    expect(generated).toContain("export const SEMANTIC_TOKEN");
    expect(generated).toContain("export const PRIMITIVE_TOKEN");
    expect(generated).toContain('"background",');
    expect(generated).toContain('"neutral-0",');
  });

  it("識別子として妥当でない群の名前だけ引用符を付ける", () => {
    const generated = generateDesignTokenTs(primitives, [
      {
        name: "user",
        schemes: [
          {
            name: "light",
            tokens: { "text-shadow": { glow: { $type: "shadow", $value: "0 0 1px #000" } } },
          },
        ],
      },
    ]);

    expect(generated).toContain('"text-shadow": [');
  });

  it("値を持たない群を目録に載せない", () => {
    const generated = generateDesignTokenTs(
      { flag: { $type: "color", $value: "#ffffff" }, breakpoint: primitives.breakpoint },
      surfaces,
    );

    expect(generated).not.toContain("flag");
  });

  // ----- 異常系 -----
  it("系統が 1 つも無い定義を拒否する", () => {
    expect(() => generateDesignTokenTs(primitives, [])).toThrow(
      '既定の系統 "user" が tokens/themes にありません',
    );
  });
});

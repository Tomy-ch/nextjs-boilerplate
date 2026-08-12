import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type TokenValue = string | string[];

type Token = {
  $type: string;
  $value: TokenValue;
};

type TokenGroup = {
  [name: string]: Token | TokenGroup;
};

const repositoryRoot = resolve(import.meta.dirname, "../..");
const primitivesPath = resolve(repositoryRoot, "tokens/primitives.json");
const themesPath = resolve(repositoryRoot, "tokens/themes.json");
const outputPath = resolve(repositoryRoot, "src/app/generated/tokens.css");
const breakpointOutputPath = resolve(repositoryRoot, "src/model/generated/breakpoint.ts");

function isToken(value: Token | TokenGroup): value is Token {
  return "$type" in value && "$value" in value;
}

function flattenTokens(group: TokenGroup, path: string[] = []): Array<[string[], Token]> {
  return Object.entries(group).flatMap(([name, value]) => {
    const nextPath = [...path, name];
    return isToken(value) ? [[nextPath, value]] : flattenTokens(value, nextPath);
  });
}

/**
 * CSS のカスタムプロパティ名は ident であり、`.` をそのまま置けない。`spacing.0.5` のような
 * 小数の段は `--spacing-0\.5` と綴る必要がある。Tailwind が生成する参照側も同じ綴りになる。
 */
function toVariableName(path: string[]): string {
  return path.join("-").replaceAll(".", String.raw`\.`);
}

function toCssValue(value: TokenValue): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

function toPrimitiveVariable(path: string[]): string {
  return `--${toVariableName(path)}`;
}

function toSemanticVariable(path: string[]): string {
  return `--semantic-${toVariableName(path)}`;
}

function toThemeVariable(path: string[]): string {
  return `--${toVariableName(path)}`;
}

/**
 * `{color.neutral.0}` 形式の参照を primitive の変数へ解決する。
 *
 * 参照は `.` 区切りだが、`spacing.0.5` のように段の名前自体が `.` を含むため区切りだけでは
 * 一意に定まらない。宣言済みの変数名と突き合わせて解決し、見つからなければ落とす。放置すると
 * 実在しない変数を指す `var()` が生成され、宣言ごと無効になって面や文字が消える。
 */
function toReference(value: string, declared: ReadonlySet<string>): string {
  const segments = value.slice(1, -1).split(".");
  for (let split = segments.length; split > 0; split--) {
    // 後ろから順に `.` を段の名前として畳み、宣言済みの変数に当たったものを採る
    const candidate = toPrimitiveVariable([
      ...segments.slice(0, split - 1),
      segments.slice(split - 1).join("."),
    ]);
    if (declared.has(candidate)) return `var(${candidate})`;
  }
  throw new Error(`token 参照 ${value} に対応する primitive がありません`);
}

const defaultThemeName = "light";

function renderDeclarations(
  tokens: TokenGroup,
  indentation: string,
  declared: ReadonlySet<string>,
): string {
  return flattenTokens(tokens)
    .map(([path, token]) => {
      const value =
        typeof token.$value === "string" && token.$value.startsWith("{")
          ? toReference(token.$value, declared)
          : toCssValue(token.$value);
      return `  ${indentation}${toSemanticVariable(path)}: ${value};`;
    })
    .join("\n");
}

/**
 * theme 1 つぶんの CSS ブロックを組み立てる。
 *
 * 既定 theme は `:root` に置き、それ以外は「OS の設定」と「`data-theme` の明示指定」の
 * 二経路で発火させる。OS 側のブロックが `data-theme` の明示指定を打ち消さないよう、
 * 既定 theme を指定した root は media query 側から除外する。
 *
 * 既定以外の theme は `screen` に限定する。media type を伴わない条件は print にも一致するため、
 * 暗い配色のまま印刷されてしまう。背景の塗りは印刷時に落ちるので、そのままだと白い紙に薄い文字が
 * 出る。既定 theme だけが `:root` に残ることで、印刷は常に既定の配色になる。
 *
 * あわせて `color-scheme` を宣言する。宣言しないと、配色を切り替えてもスクロールバー・フォーム
 * 部品・キャンバスの既定描画が light のまま取り残される。theme の切替条件と同じ場所で出すのは、
 * 条件を二重に書くと必ずどちらかがずれるためである。
 */
function renderTheme(name: string, tokens: TokenGroup, declared: ReadonlySet<string>): string[] {
  if (name === defaultThemeName) {
    return [`:root {\n  color-scheme: ${name};\n${renderDeclarations(tokens, "", declared)}\n}`];
  }

  return [
    `@media screen and (prefers-color-scheme: ${name}) {\n  :root:not([data-theme="${defaultThemeName}"]) {\n    color-scheme: ${name};\n${renderDeclarations(tokens, "  ", declared)}\n  }\n}`,
    `@media screen {\n  :root[data-theme="${name}"] {\n    color-scheme: ${name};\n${renderDeclarations(tokens, "  ", declared)}\n  }\n}`,
  ];
}

/**
 * breakpoint の段を TypeScript の定数として生成する。
 *
 * @remarks
 * CSS 側は `@theme` の `--breakpoint-*` を Tailwind が読み、`lg:` などの variant になります。JS から
 * media query を組む経路はそこを読めないため、同じ SSOT から両方を出します。片方を手で書くと、段を
 * 差し替えたときに CSS と JS で境界がずれ、両方出る幅か両方消える幅ができます。
 */
export function generateBreakpointTs(primitives: TokenGroup): string {
  const group = primitives.breakpoint;

  if (group === undefined || isToken(group)) {
    throw new Error("primitives.json に breakpoint の段がありません");
  }

  // biome の整形結果と同じ綴りで出す。識別子として妥当な名前は引用符を付けない。付けたまま出すと
  // `pnpm fix` が外し、生成物と SSOT の一致検査が落ちる。
  const entries = flattenTokens(group).map(([path, token]) => {
    const name = path.join("-");
    const key = /^[A-Za-z_$][\w$]*$/.test(name) ? name : `"${name}"`;

    return `  ${key}: "${toCssValue(token.$value)}",`;
  });

  return [
    "// このファイルは tokens/scripts/gen-tokens.ts から生成されます。手編集禁止。",
    "",
    "/** 段の名前と幅。CSS の `--breakpoint-*` と同じ SSOT から生成される。 */",
    "export const BREAKPOINT = {",
    ...entries,
    "} as const;",
    "",
  ].join("\n");
}

/** W3C Design Tokens 形式の入力から Tailwind v4 用 CSS を生成する。 */
export function generateTokensCss(primitives: TokenGroup, themes: TokenGroup): string {
  const primitivePaths = flattenTokens(primitives);
  const declared = new Set(primitivePaths.map(([path]) => toPrimitiveVariable(path)));
  const primitiveDeclarations = primitivePaths.map(
    ([path, token]) => `  ${toPrimitiveVariable(path)}: ${toCssValue(token.$value)};`,
  );
  const themeEntries = Object.entries(themes.theme as TokenGroup);
  const defaultTheme = themeEntries.find(([name]) => name === defaultThemeName)?.[1] as
    | TokenGroup
    | undefined;

  if (!defaultTheme) {
    throw new Error(`既定の theme "${defaultThemeName}" が themes.json にありません`);
  }

  const semanticDeclarations = flattenTokens(defaultTheme).map(([path]) => {
    return `  ${toThemeVariable(path)}: var(${toSemanticVariable(path)});`;
  });

  return [
    "/* このファイルは tokens/scripts/gen-tokens.ts から生成されます。手編集禁止。 */",
    "",
    "@theme {",
    ...primitiveDeclarations,
    "}",
    "",
    "@theme inline {",
    ...semanticDeclarations,
    "}",
    "",
    ...themeEntries.flatMap(([name, tokens]) => renderTheme(name, tokens as TokenGroup, declared)),
    "",
  ].join("\n");
}

async function readTokenFile(path: string): Promise<TokenGroup> {
  return JSON.parse(await readFile(path, "utf8")) as TokenGroup;
}

/** token SSOT を読み込み、生成物との一致を検証または生成する。 */
export async function generateOrCheckTokens(checkOnly: boolean): Promise<void> {
  const [primitives, themes] = await Promise.all([
    readTokenFile(primitivesPath),
    readTokenFile(themesPath),
  ]);
  const generatedCss = generateTokensCss(primitives, themes);
  const generatedBreakpoint = generateBreakpointTs(primitives);

  if (!checkOnly) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, generatedCss);
    await mkdir(dirname(breakpointOutputPath), { recursive: true });
    await writeFile(breakpointOutputPath, generatedBreakpoint);
    return;
  }

  const [currentCss, currentBreakpoint] = await Promise.all([
    readFile(outputPath, "utf8"),
    readFile(breakpointOutputPath, "utf8"),
  ]);

  if (currentCss !== generatedCss || currentBreakpoint !== generatedBreakpoint) {
    throw new Error(
      "design token の生成物が SSOT と一致しません。pnpm gen:tokens を実行してください。",
    );
  }
}

/* v8 ignore start -- CLI entry。起動経路は pnpm gen:tokens / check:tokens が実地で通す。 */
if (process.argv[1]?.endsWith("gen-tokens.ts")) {
  void generateOrCheckTokens(process.argv.includes("--check")).catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}
/* v8 ignore stop */

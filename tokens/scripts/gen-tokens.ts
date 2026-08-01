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

function isToken(value: Token | TokenGroup): value is Token {
  return "$type" in value && "$value" in value;
}

function flattenTokens(group: TokenGroup, path: string[] = []): Array<[string[], Token]> {
  return Object.entries(group).flatMap(([name, value]) => {
    const nextPath = [...path, name];
    return isToken(value) ? [[nextPath, value]] : flattenTokens(value, nextPath);
  });
}

function toVariableName(path: string[]): string {
  return path.join("-");
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

function toReference(value: string): string {
  const path = value.slice(1, -1).split(".");
  return `var(${toPrimitiveVariable(path)})`;
}

function renderTheme(name: string, tokens: TokenGroup): string {
  const indentation = name === "light" ? "" : "  ";
  const declarations = flattenTokens(tokens).map(([path, token]) => {
    const value =
      typeof token.$value === "string" && token.$value.startsWith("{")
        ? toReference(token.$value)
        : toCssValue(token.$value);
    return `  ${indentation}${toSemanticVariable(path)}: ${value};`;
  });

  if (name === "light") {
    return `:root {\n${declarations.join("\n")}\n}`;
  }

  return `@media (prefers-color-scheme: ${name}) {\n  :root {\n${declarations.join("\n")}\n  }\n}`;
}

/** W3C Design Tokens 形式の入力から Tailwind v4 用 CSS を生成する。 */
export function generateTokensCss(primitives: TokenGroup, themes: TokenGroup): string {
  const primitiveDeclarations = flattenTokens(primitives).map(
    ([path, token]) => `  ${toPrimitiveVariable(path)}: ${toCssValue(token.$value)};`,
  );
  const themeEntries = Object.entries(themes.theme as TokenGroup);
  const defaultTheme = themeEntries.find(([name]) => name === "light")?.[1] as TokenGroup;
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
    ...themeEntries.map(([name, tokens]) => renderTheme(name, tokens as TokenGroup)),
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

  if (!checkOnly) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, generatedCss);
    return;
  }

  const currentCss = await readFile(outputPath, "utf8");
  if (currentCss !== generatedCss) {
    throw new Error(
      "design token の生成物が SSOT と一致しません。pnpm gen:tokens を実行してください。",
    );
  }
}

if (process.argv[1]?.endsWith("gen-tokens.ts")) {
  void generateOrCheckTokens(process.argv.includes("--check")).catch((error: unknown) => {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  });
}

import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * 実行場所の境界を守る ESLint の規則が、実際に鳴るかのゲート。
 *
 * @remarks
 * 規則の本体は `eslint.config.ts` の `no-restricted-syntax` / `no-restricted-imports` で、独自
 * ルール（`eslint-rules/`）と違って `RuleTester` を当てられない。**守っているものの半分は
 * 設定の側にある** —— どのパスへ効かせるか（`files`）と、どこを外すか（`ignores` に展開した
 * `architecture.ts` の `NODE_RUNTIME_ACCESS`）である。セレクタだけを見ても、効く範囲が合って
 * いるかは分からない。
 *
 * だから実物の設定を通して lint する。セレクタを狭めても、除外を広げても、ここが落ちる。
 */

const REPOSITORY_ROOT = new URL("..", import.meta.url).pathname;

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: REPOSITORY_ROOT });
});

/** 1 ファイルぶんを設定どおりに検査し、出た message の rule 名を返す。 */
async function rulesFiredOn(filePath: string, source: string): Promise<string[]> {
  const [result] = await eslint.lintText(source, { filePath });

  return (result?.messages ?? []).map((message) => message.ruleId ?? "");
}

// 実物の設定を読み込むため、既定の 5 秒では足りない。
const TIMEOUT_MS = 60_000;

describe("実行場所の境界の規則", () => {
  // ----- 正常系 -----
  it(
    "config カーネルは `process` と `node:` を読める",
    async () => {
      const fired = await rulesFiredOn(
        "src/config/probe.ts",
        'import { join } from "node:path";\n\nexport const a = join(process.cwd(), "x");\n',
      );

      expect(fired).toEqual([]);
    },
    TIMEOUT_MS,
  );

  it(
    "テストは束に載らないので対象外",
    async () => {
      const fired = await rulesFiredOn(
        "src/features/probe/probe.test.ts",
        'import { PassThrough } from "node:stream";\n\nexport const a = new PassThrough();\n',
      );

      expect(fired).toEqual([]);
    },
    TIMEOUT_MS,
  );

  it(
    '器でない route segment のファイルは `"use client"` を持てる',
    async () => {
      const fired = await rulesFiredOn(
        "src/app/probe/error.tsx",
        '"use client";\n\nexport default function E() {\n  return null;\n}\n',
      );

      expect(fired).toEqual([]);
    },
    TIMEOUT_MS,
  );

  // ----- 異常系 -----
  it(
    "config カーネルの外からの `process` の直読みを止める",
    async () => {
      const fired = await rulesFiredOn(
        "src/features/probe/probe.ts",
        "export const a = process.env.SOME_VALUE;\n",
      );

      expect(fired).toEqual(["no-restricted-syntax"]);
    },
    TIMEOUT_MS,
  );

  it(
    "`globalThis.process` という別の綴りでも止める",
    async () => {
      const fired = await rulesFiredOn(
        "src/features/probe/probe.ts",
        "export const a = globalThis.process.env.SOME_VALUE;\n",
      );

      expect(fired).toEqual(["no-restricted-syntax"]);
    },
    TIMEOUT_MS,
  );

  it(
    "config カーネルの外からの `node:` の import を止める",
    async () => {
      const fired = await rulesFiredOn(
        "src/features/probe/probe.ts",
        'import { join } from "node:path";\n\nexport const a = join("x", "y");\n',
      );

      expect(fired).toEqual(["no-restricted-imports"]);
    },
    TIMEOUT_MS,
  );

  it(
    "route segment の器を Client Component にすることを止める",
    async () => {
      const fired = await rulesFiredOn(
        "src/app/probe/page.tsx",
        '"use client";\n\nexport default function P() {\n  return null;\n}\n',
      );

      expect(fired).toEqual(["no-restricted-syntax"]);
    },
    TIMEOUT_MS,
  );
});

import { resolve } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

/**
 * `src/` の外に居る区画の依存の宣言が、実際に効いていることを見るゲート。
 *
 * @remarks
 * **宣言が `boundaries/include` に載っていることと、規則が当たることは別である。** ルールブロックの
 * `files` から外れた場所では、依存の宣言は一度も評価されないまま緑になる。その状態は「検査して
 * 違反が無い」と見分けが付かないので、宣言を読むのではなく **ESLint に実際に掛けて落ちることを
 * 確かめる**（`app-elements.gate.test.ts` と同じ形）。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..");

// ESLint の設定一式を読み込むため、既定の 5 秒では足りない。
const TIMEOUT_MS = 120_000;

async function boundaryErrorsOf(filePath: string, source: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: REPOSITORY_ROOT });
  const [result] = await eslint.lintText(source, { filePath });

  return (result?.messages ?? [])
    .filter((message) => message.ruleId === "boundaries/dependencies")
    .map((message) => message.message);
}

describe("mocks の依存の宣言", () => {
  // ----- 異常系 -----
  it(
    "feature を引くと落ちる",
    async () => {
      const errors = await boundaryErrorsOf(
        "mocks/probe.ts",
        'import { loginPath } from "@/features/auth/facade/paths";\n\nexport const probe = loginPath;\n',
      );

      expect(errors).toHaveLength(1);
      // 件数だけでは、別の policy が偶然 1 件当たった場合と区別できない。落ちた向きまで見る。
      expect(errors[0]).toContain("mocks");
      expect(errors[0]).toContain("features");
    },
    TIMEOUT_MS,
  );

  it(
    "境界アダプタを引くと落ちる",
    async () => {
      const errors = await boundaryErrorsOf(
        "mocks/probe.ts",
        'import { toErrorResponse } from "@/adapters/server/http/error-response";\n\nexport const probe = toErrorResponse;\n',
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("mocks");
      expect(errors[0]).toContain("adapters");
    },
    TIMEOUT_MS,
  );

  // ----- 正常系 -----
  it(
    "契約から来るもの（生成した wire 型と表示用の型）は引ける",
    async () => {
      const errors = await boundaryErrorsOf(
        "mocks/probe.ts",
        'import type { SafeReturnUrl } from "@/model/return-url";\n\nexport type Probe = SafeReturnUrl;\n',
      );

      expect(errors).toEqual([]);
    },
    TIMEOUT_MS,
  );
});

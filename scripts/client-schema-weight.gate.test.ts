import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";

import {
  findHeavyClientImports,
  formatHeavyClientImports,
  type SourceModule,
} from "./lib/client-schema-weight";

/**
 * client bundle へ重い検証の入口が入り込んでいないかを見るゲート。
 *
 * @remarks
 * 判定の中身は `lib/client-schema-weight.ts` が持ち、ここはツリーの走査だけを担う
 * （`doc-links.gate.test.ts` と同形）。
 *
 * **この無駄は、誰も見ていなかったから存在していた。** 上限値の定数を 1 つ取る import が、契約の
 * 全エンドポイントぶんの zod スキーマと説明文をブラウザへ配っていた。型検査も lint も import の
 * 先にある重さを見ないため、増えても何も落ちない。予算（`bundle-budget`）は総量で捕まえるが、
 * **なぜ増えたかは答えない**ので、原因の側にゲートを置く。
 */

const REPOSITORY_ROOT = resolvePath(import.meta.dirname, "..");
const SOURCE_ROOT = join(REPOSITORY_ROOT, "src");
const TIMEOUT_MS = 60_000;

/** 走査から外す。テストと story は bundle に載らない。 */
const EXCLUDED = /\.(test|stories)\.tsx?$/;

function collect(directory: string, into: SourceModule[]): SourceModule[] {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      collect(path, into);
      continue;
    }

    if (/\.tsx?$/.test(path) && !EXCLUDED.test(path)) {
      into.push({ path: relative(REPOSITORY_ROOT, path), content: readFileSync(path, "utf8") });
    }
  }

  return into;
}

/** import 先をリポジトリルート相対のパスへ解決する。外部パッケージは辿らない。 */
function resolveModule(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(SOURCE_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolvePath(dirname(join(REPOSITORY_ROOT, from)), specifier)
      : null;

  if (base === null) {
    return null;
  }

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(REPOSITORY_ROOT, candidate);
    }
  }

  return null;
}

describe("client bundle の重さ", () => {
  // ----- 正常系 -----
  it(
    "client から到達する module は、重い検証の入口を引かない",
    () => {
      const found = findHeavyClientImports(collect(SOURCE_ROOT, []), resolveModule);

      expect(formatHeavyClientImports(found)).toBe("");
    },
    TIMEOUT_MS,
  );
});

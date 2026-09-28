import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve as resolvePath } from "node:path";
import { describe, expect, it } from "vitest";

import { findNodeOnlyImports, formatNodeOnlyImports, runtimeImportsOf } from "./lib/edge-imports";

/**
 * Proxy から静的に届く module が、Node.js にしか無い入口を引いていないかのゲート。
 *
 * @remarks
 * 判定の中身は `lib/edge-imports.ts` が持ち、ここは読み込みと解決だけを担う
 * （`client-schema-weight.gate.test.ts` と同形）。
 *
 * **Proxy は最適化の際に CDN（Edge 相当）へ置かれうる。** そこから辿れる module は Node.js の API も
 * ENV ファイルの読込も要してはならないが、型検査も lint も import の先の実行環境を見ないので、
 * 辿れるグラフの側にゲートを置く。config のどこまでが辿れてよいかは `src/config/README.md`「運用」が
 * 持つ。
 */

const REPOSITORY_ROOT = resolvePath(import.meta.dirname, "..");
const SOURCE_ROOT = join(REPOSITORY_ROOT, "src");
const ENTRY = "src/proxy.ts";
const TIMEOUT_MS = 60_000;

function load(path: string): string | null {
  const absolute = join(REPOSITORY_ROOT, path);

  return existsSync(absolute) ? readFileSync(absolute, "utf8") : null;
}

function resolveModule(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(SOURCE_ROOT, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolvePath(dirname(join(REPOSITORY_ROOT, from)), specifier)
      : null;

  if (base === null) {
    return null;
  }

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(REPOSITORY_ROOT, candidate);
    }
  }

  return null;
}

describe("Proxy の実行環境", () => {
  // ----- 正常系 -----
  it(
    "Proxy から届く module は `node:*` の組み込み module も `dotenv` も引かない",
    () => {
      expect(formatNodeOnlyImports(findNodeOnlyImports(ENTRY, load, resolveModule))).toBe("");
    },
    TIMEOUT_MS,
  );

  it(
    "検査の射程が、入口と別名の解決に届いている",
    () => {
      const content = load(ENTRY);

      expect(content).not.toBeNull();

      const resolved = runtimeImportsOf(ENTRY, content ?? "").filter(
        (specifier) => specifier.startsWith("@/") && resolveModule(ENTRY, specifier) !== null,
      );

      expect(resolved.length).toBeGreaterThan(0);
    },
    TIMEOUT_MS,
  );
});

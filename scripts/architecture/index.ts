import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { KERNELS, type Kernel } from "../../architecture";
import { findBoundaryDrift, parseBoundaryFrontmatter } from "./readme-boundaries";

/**
 * 境界を宣言している README を、`src/` を辿って集める。
 *
 * @remarks
 * **カーネル直下だけを見ません。** 宣言はカーネルの下の階層にも置かれます
 * （[0021](../../docs/adr/0021-frontend-responsibility.md) は feature ごとにも同じ
 * frontmatter を持つ README を求めます）。カーネル直下だけを突き合わせると、その下の宣言は
 * 誰も読まないまま `architecture.ts` から離れていきます。実際に離れました —— feature の
 * 宣言は 10 本すべてが `observability` を落としたまま残っていました。
 *
 * 属するカーネルは `src/` の直下のディレクトリ名で決まります。宣言の一覧を持たないのは、
 * 一覧の外へ宣言を書けてしまい、しかもその取りこぼしが無言だからです。
 */
function collectBoundaryReadmes(): { path: string; kernel: Kernel }[] {
  const found: { path: string; kernel: Kernel }[] = [];

  const walk = (directory: string, kernel: Kernel): void => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);

      if (statSync(path).isDirectory()) {
        walk(path, kernel);
        continue;
      }

      if (entry !== "README.md") {
        continue;
      }

      if (readFileSync(path, "utf8").includes("\nimports-allowed:")) {
        found.push({ path, kernel });
      }
    }
  };

  for (const kernel of KERNELS) {
    const root = `src/${kernel}`;

    if (existsSync(root)) {
      walk(root, kernel);
    }
  }

  return found;
}

const failures: string[] = [];

for (const kernel of KERNELS) {
  if (!existsSync(`src/${kernel}/README.md`)) {
    failures.push(`src/${kernel}/README.md がありません`);
  }
}

const declarations = collectBoundaryReadmes();

for (const { path, kernel } of declarations) {
  try {
    const drift = findBoundaryDrift(kernel, parseBoundaryFrontmatter(readFileSync(path, "utf8")));

    for (const message of drift) {
      failures.push(`${path}: ${message}`);
    }
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error("❌ 層 README の境界宣言が architecture.ts と食い違っています:");

  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }

  process.exit(1);
}

console.log(`✅ ${declarations.length} 件の境界宣言が architecture.ts と一致しています`);

import { existsSync, readFileSync } from "node:fs";

import { KERNELS } from "../../architecture";
import { findBoundaryDrift, parseBoundaryFrontmatter } from "./readme-boundaries";

const failures: string[] = [];

for (const kernel of KERNELS) {
  const path = `src/${kernel}/README.md`;

  if (!existsSync(path)) {
    failures.push(`${path} がありません`);
    continue;
  }

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

console.log(`✅ ${KERNELS.length} カーネルの境界宣言が architecture.ts と一致しています`);

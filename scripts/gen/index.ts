import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DEPENDENCIES, type Kernel } from "../../architecture";
import { readLayerContract } from "./layer-contract";
import { validateName } from "./naming";
import { type GenerationKind, isGenerationKind, planGeneration } from "./plan";

/**
 * 雛形生成の入口。`pnpm gen <kind> <name> [area]` から呼ばれる。
 *
 * @remarks
 * 生成は段階に分け、前段が確定しないうちは次段へ進みません（IM-27 の chain 構造）。
 * 導出できない入力に出会ったら、書きかけを片付けようとせず、そこで止めて理由を出します
 * （halt / hand-off）。1 ファイルも書いていない時点で止まるので、ロールバックは要りません。
 */

const REPOSITORY_ROOT = resolve(import.meta.dirname, "..", "..");

/** 生成する種類ごとの、契約を読む層 README。 */
const LAYER_README: Record<GenerationKind, string> = {
  feature: "src/features/README.md",
  component: "src/components/README.md",
  adapter: "src/adapters/README.md",
};

/** 生成する種類ごとの、`architecture.ts` 上の層。 */
const LAYER_KERNEL: Record<GenerationKind, Kernel> = {
  feature: "features",
  component: "components",
  adapter: "adapters",
};

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const [kind, name, area] = process.argv.slice(2);

if (kind === undefined || name === undefined) {
  fail("使い方: pnpm gen <feature|component|adapter> <kebab-case-name> [component の配置区画]");
}

if (!isGenerationKind(kind)) {
  fail(
    `種類 "${kind}" は生成できません。feature / component / adapter のいずれかを指定してください。`,
  );
}

const nameError = validateName(name);

if (nameError !== null) {
  fail(nameError);
}

const readmePath = resolve(REPOSITORY_ROOT, LAYER_README[kind]);

if (!existsSync(readmePath)) {
  fail(`層 README ${LAYER_README[kind]} が見つかりません。生成先の層が未整備です。`);
}

const contract = readLayerContract(readFileSync(readmePath, "utf8"));

if (contract === null) {
  fail(
    `${LAYER_README[kind]} の frontmatter から forbidden / test-requirement を読めません。層の宣言を先に整えてください。`,
  );
}

const files = planGeneration({
  kind,
  name,
  importsAllowed: DEPENDENCIES[LAYER_KERNEL[kind]],
  contract,
  area,
});

const existing = files.filter((file) => existsSync(resolve(REPOSITORY_ROOT, file.path)));

if (existing.length > 0) {
  fail(`次のパスが既に在ります。上書きしません: ${existing.map((file) => file.path).join(", ")}`);
}

for (const file of files) {
  const absolute = resolve(REPOSITORY_ROOT, file.path);

  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, file.content, "utf8");
}

console.log(`✅ ${kind} "${name}" の雛形を生成しました`);

for (const file of files) {
  console.log(`   ${file.path}`);
}

console.log(
  "\n次に行うこと:\n  1. README の TODO を埋める\n  2. pnpm fix && pnpm lint:ci\n  3. /scaffold-test でテストの観点を詰める",
);

import { relative } from "node:path";

import type { Rule } from "eslint";

import { UI_KERNELS } from "../architecture";

/**
 * UI を置いてよい層の外で JSX を書かせないルール。
 *
 * 置いてよい層は [`architecture.ts`](../architecture.ts) の `UI_KERNELS` が持ち、根拠は
 * [0021](../docs/adr/0021-frontend-responsibility.md) の層別責務表にある。`eslint-plugin-boundaries`
 * は import の向きしか見ないため、層の中で完結する JSX は境界検査を素通りする。Biome にも同等の
 * 検査は無い([0002](../docs/adr/0002-formatter-linter.md))。
 *
 * テストは対象外にする。hook を回すのに wrapper を描くことがあり、それは層の担う UI ではない。
 *
 * 報告はファイルにつき 1 件に留める。指摘は「この JSX が悪い」ではなく「この置き場が違う」で、
 * 直し方は要素ごとに変わらない。
 */
const UI_LAYERS: readonly string[] = UI_KERNELS;

/**
 * 層名を取り出す。層の外なら `undefined`。
 *
 * 起点からの相対で見る。`docs-viewer/src/` のようにワークスペースの中にも `src/` があり、
 * ファイル名のどこかで `src/` に一致させると、そちらの直下も層として数えてしまう。
 */
function layerOf(filename: string, cwd: string): string | undefined {
  return /^src\/([^/]+)\//.exec(relative(cwd, filename).replaceAll("\\", "/"))?.[1];
}

/** テストか。 */
function isTest(filename: string): boolean {
  return /\.test\.[cm]?[jt]sx?$/.test(filename);
}

const noJsxOutsideUiLayers: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "UI を置いてよい層の外で JSX を書かない",
    },
    schema: [],
    messages: {
      noJsxOutsideUiLayers:
        "{{layer}} は UI を持ちません。JSX は {{allowed}} のいずれかへ置いてください。",
    },
  },
  create(context) {
    const layer = layerOf(context.filename, context.cwd);

    if (layer === undefined || UI_LAYERS.includes(layer) || isTest(context.filename)) {
      return {};
    }

    let reported = false;
    const report = (node: Rule.Node) => {
      if (reported) {
        return;
      }

      reported = true;
      context.report({
        node,
        messageId: "noJsxOutsideUiLayers",
        data: { layer, allowed: UI_LAYERS.join(" / ") },
      });
    };

    return { JSXElement: report, JSXFragment: report };
  },
};

export default noJsxOutsideUiLayers;

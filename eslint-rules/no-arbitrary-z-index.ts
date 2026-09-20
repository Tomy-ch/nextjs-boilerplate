import type { Rule } from "eslint";

/**
 * 重なりの段を任意値で増やさせないルール。
 *
 * 規約そのものは `docs/rules.md`「レイアウトと帯」が持つ。Biome は class 文字列の中身を見ないため
 * ESLint 側で持つ。
 *
 * **文字列リテラルだけを見る。** class は文字列としてしか書けないので、これで書かれた分は必ず拾える。
 * 式で組んだ class は解決先が分からないため見送る（`no-raw-font-weight` と同じ線引き）。
 */

/** 任意値で書いた重なりの段。負の段（`-z-[…]`）も同じ形で書かれる。 */
const ARBITRARY_Z_INDEX = /\bz-\[[^\]]*\]/;

const noArbitraryZIndex: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "重なりの段は Tailwind の段階値だけを使う",
    },
    schema: [],
    messages: {
      noArbitraryZIndex:
        "重なりの段を任意値で書かないでください（{{ utility }}）。段階値（`z-10` / `z-20` …）だけを使います。任意値は既存の段の間に割り込み、どれが上かを画面全体から読まないと決められなくなります。",
    },
  },
  create(context) {
    function check(node: Rule.Node, value: unknown): void {
      if (typeof value !== "string") {
        return;
      }

      const found = ARBITRARY_Z_INDEX.exec(value);

      if (found !== null) {
        context.report({ node, messageId: "noArbitraryZIndex", data: { utility: found[0] } });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node as unknown as Rule.Node, node.value.cooked);
      },
    };
  },
};

export default noArbitraryZIndex;

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noArbitraryZIndex from "./no-arbitrary-z-index";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("noArbitraryZIndex", () => {
  // ----- 正常系 -----
  it("段階値と、段を表さない class を通す", () => {
    ruleTester.run("no-arbitrary-z-index", noArbitraryZIndex, {
      valid: [
        "const a = <div className='z-10'>上</div>;",
        "const a = <div className='z-50 fixed'>上</div>;",
        "const a = <div className='-z-10'>下</div>;",
        // 段を表さない、任意値を持つ別の utility を巻き込まない。
        "const a = <div className='w-[320px]'>幅</div>;",
        // 段の名前を含むだけの、より長い class 名を巻き込まない（語境界）。
        "const a = <div className='size-[2px]'>点</div>;",
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("任意値で書いた段を挙げる", () => {
    ruleTester.run("no-arbitrary-z-index", noArbitraryZIndex, {
      valid: [],
      invalid: [
        {
          code: "const a = <div className='z-[60]'>上</div>;",
          errors: [{ messageId: "noArbitraryZIndex" }],
        },
        {
          code: "const a = <div className='fixed z-[999] inset-0'>覆い</div>;",
          errors: [{ messageId: "noArbitraryZIndex" }],
        },
        {
          code: "const a = <div className='-z-[1]'>下</div>;",
          errors: [{ messageId: "noArbitraryZIndex" }],
        },
      ],
    });
  });

  it("文字列でない literal は見ない", () => {
    // 数値・真偽値・null も Literal ノードとして訪れる。class になり得ないので判定に掛けない。
    ruleTester.run("no-arbitrary-z-index", noArbitraryZIndex, {
      valid: ["const a = 1;", "const b = true;", "const c = null;"],
      invalid: [],
    });
  });

  it("テンプレート literal の中でも挙げる", () => {
    ruleTester.run("no-arbitrary-z-index", noArbitraryZIndex, {
      valid: [],
      invalid: [
        {
          // 検査対象のコードを文字列で渡すため、テンプレート記法はここでは組み立てない。
          code: ["const a = <div className={`${", "base} z-[70]`}>上</div>;"].join(""),
          errors: [{ messageId: "noArbitraryZIndex" }],
        },
      ],
    });
  });
});

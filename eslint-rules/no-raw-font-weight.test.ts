import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noRawFontWeight from "./no-raw-font-weight";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("noRawFontWeight", () => {
  // ----- 正常系 -----
  it("semantic の名前と、打ち消しの font-normal を通す", () => {
    ruleTester.run("no-raw-font-weight", noRawFontWeight, {
      valid: [
        "const a = <p className='font-emphasis'>強調</p>;",
        // 400 はどの書体も持つため丸められない。「強調しない」を明示する打ち消し。
        "const a = <p className='font-normal text-sm'>本文</p>;",
        // 太さを表さない class を巻き込まない。
        "const a = <p className='font-mono'>コード</p>;",
        "const a = <p className='leading-normal'>本文</p>;",
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("本文より強い段の直接指定を挙げる", () => {
    ruleTester.run("no-raw-font-weight", noRawFontWeight, {
      valid: [],
      invalid: [
        {
          code: "const a = <p className='font-medium'>強調</p>;",
          errors: [{ messageId: "noRawFontWeight" }],
        },
        {
          code: "const a = <p className='text-lg font-semibold'>見出し</p>;",
          errors: [{ messageId: "noRawFontWeight" }],
        },
        {
          code: "const a = <p className='font-bold'>見出し</p>;",
          errors: [{ messageId: "noRawFontWeight" }],
        },
      ],
    });
  });

  it("テンプレート literal の中でも挙げる", () => {
    ruleTester.run("no-raw-font-weight", noRawFontWeight, {
      valid: [],
      invalid: [
        {
          // 検査対象のコードを文字列で渡すため、テンプレート記法はここでは組み立てない。
          code: ["const a = <p className={`${", "ring} font-medium`}>強調</p>;"].join(""),
          errors: [{ messageId: "noRawFontWeight" }],
        },
      ],
    });
  });
});

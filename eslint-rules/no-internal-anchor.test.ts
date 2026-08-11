import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noInternalAnchor from "./no-internal-anchor";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe("noInternalAnchor", () => {
  // ----- 正常系 -----
  it("a 以外の要素と、静的に解決できない href を通す", () => {
    ruleTester.run("no-internal-anchor", noInternalAnchor, {
      valid: [
        "const a = <Foo.Bar href='/products' />;",
        "const a = <div href='/products' />;",
        "const a = <a>ラベル</a>;",
        "const a = <a className='underline'>ラベル</a>;",
        "const a = <a xlink:href='/products'>ラベル</a>;",
        "const a = <a href>ラベル</a>;",
        "const a = <a href={to}>ラベル</a>;",
        "const a = <a href='https://example.com'>ラベル</a>;",
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("`/` 始まりのリテラル href を持つ a を報告する", () => {
    ruleTester.run("no-internal-anchor", noInternalAnchor, {
      valid: [],
      invalid: [
        {
          code: "const a = <a href='/products'>ラベル</a>;",
          errors: [{ messageId: "noInternalAnchor" }],
        },
        {
          code: "const a = <a {...rest} href='/products'>ラベル</a>;",
          errors: [{ messageId: "noInternalAnchor" }],
        },
      ],
    });
  });
});

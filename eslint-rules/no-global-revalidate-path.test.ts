import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noGlobalRevalidatePath from "./no-global-revalidate-path";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

describe("noGlobalRevalidatePath", () => {
  // ----- 正常系 -----
  it("所有境界を名乗る再検証を通す", () => {
    ruleTester.run("no-global-revalidate-path", noGlobalRevalidatePath, {
      valid: [
        'revalidatePath("/shop/products");',
        'revalidatePath("/shop/products/[id]", "page");',
        // 全体を指すが、配下を巻き込む型ではない。
        'revalidatePath("/");',
        'revalidateTag("products");',
        // 名前だけが同じ別の関数を巻き込まない。
        'other("/", "layout");',
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("アプリ全体を捨てる呼び方を挙げる", () => {
    ruleTester.run("no-global-revalidate-path", noGlobalRevalidatePath, {
      valid: [],
      invalid: [
        {
          code: 'revalidatePath("/", "layout");',
          errors: [{ messageId: "noGlobalRevalidatePath" }],
        },
      ],
    });
  });

  it("名前空間を経由した綴りでも挙げる", () => {
    ruleTester.run("no-global-revalidate-path", noGlobalRevalidatePath, {
      valid: [],
      invalid: [
        {
          code: 'cache.revalidatePath("/", "layout");',
          errors: [{ messageId: "noGlobalRevalidatePath" }],
        },
      ],
    });
  });

  it("引数が変数なら、何を指すかが決まらないので挙げない", () => {
    ruleTester.run("no-global-revalidate-path", noGlobalRevalidatePath, {
      valid: ['revalidatePath(path, "layout");', 'revalidatePath("/", type);'],
      invalid: [],
    });
  });

  it("呼び出しの名前が式で決まる形は見ない", () => {
    // 添字で引いた関数は、名前がここでは決まらない。
    ruleTester.run("no-global-revalidate-path", noGlobalRevalidatePath, {
      valid: ['cache["revalidatePath"]("/", "layout");'],
      invalid: [],
    });
  });
});

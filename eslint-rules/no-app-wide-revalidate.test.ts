import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noAppWideRevalidate from "./no-app-wide-revalidate";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

describe("noAppWideRevalidate", () => {
  // ----- 正常系 -----
  it("所有境界を指した再検証を通す", () => {
    ruleTester.run("no-app-wide-revalidate", noAppWideRevalidate, {
      valid: [
        // route を 1 つ指した形。
        'revalidatePath("/cart");',
        // 根であっても、器まで捨てない形。
        'revalidatePath("/", "page");',
        // 根でない経路の器。
        'revalidatePath("/admin/shipments", "layout");',
        // 引数の数が違う形は見ない。
        'revalidatePath("/");',
        'revalidatePath("/", "layout", "extra");',
        // 経路が静的に決まらない形は見ない。
        'revalidatePath(path, "layout");',
        // 式を含むテンプレートリテラルも静的に決まらない。根に見えても別の経路である。
        ["revalidatePath(`/$", '{locale}`, "layout");'].join(""),
        'revalidatePath("/", type);',
        // 文字列でない引数は見ない。
        'revalidatePath(1, "layout");',
        // 名前だけが同じ別の関数を巻き込まない。
        'revalidateRoute("/", "layout");',
        // 呼び出しの名前が式で決まる形は見ない。
        'cache.revalidatePath("/", "layout");',
        'cache["revalidatePath"]("/", "layout");',
        // 呼び出しの形でない識別子を巻き込まない。
        "const f = revalidatePath;",
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("アプリ全体を捨てる呼び方を挙げる", () => {
    ruleTester.run("no-app-wide-revalidate", noAppWideRevalidate, {
      valid: [],
      invalid: [
        {
          code: 'revalidatePath("/", "layout");',
          errors: [{ messageId: "appWide" }],
        },
        // テンプレートリテラルで書いても同じ形である。
        {
          code: ["revalidatePath(`/`, `layout", "`);"].join(""),
          errors: [{ messageId: "appWide" }],
        },
      ],
    });
  });
});

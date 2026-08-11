import { RuleTester } from "eslint";
import { describe, it } from "vitest";

import noAnonymousDefaultExport from "./no-anonymous-default-export";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

describe("noAnonymousDefaultExport", () => {
  // ----- 正常系 -----
  it("名前付きの関数宣言・クラス宣言と、識別子への参照を通す", () => {
    ruleTester.run("no-anonymous-default-export", noAnonymousDefaultExport, {
      valid: [
        "export default function Foo() {}",
        "export default class Foo {}",
        "export default (function Foo() {});",
        "export default (class Foo {});",
        "const Foo = () => null;\nexport default Foo;",
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("名前を持たない default export を報告する", () => {
    ruleTester.run("no-anonymous-default-export", noAnonymousDefaultExport, {
      valid: [],
      invalid: [
        {
          code: "export default () => null;",
          errors: [{ messageId: "anonymousDefaultExport" }],
        },
        {
          code: "export default function () {}",
          errors: [{ messageId: "anonymousDefaultExport" }],
        },
        {
          code: "export default class {}",
          errors: [{ messageId: "anonymousDefaultExport" }],
        },
        {
          code: "export default (function () {});",
          errors: [{ messageId: "anonymousDefaultExport" }],
        },
        {
          code: "export default (class {});",
          errors: [{ messageId: "anonymousDefaultExport" }],
        },
        {
          code: "export default { title: 'x' };",
          errors: [{ messageId: "anonymousDefaultExport" }],
        },
      ],
    });
  });
});

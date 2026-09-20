import { resolve } from "node:path";

import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noAdHocCacheTag from "./no-ad-hoc-cache-tag";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

/** 取得側。印を付けてよい場所。 */
const IN_ADAPTERS = "src/adapters/server/api/products.ts";

/** 捨てる側。印を付けてはいけない場所。 */
const OUTSIDE_ADAPTERS = "src/features/admin/products/actions.ts";

describe("noAdHocCacheTag", () => {
  // ----- 正常系 -----
  it("取得側の 2 段までの印を通す", () => {
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [
        { code: 'cacheTag("products");', filename: IN_ADAPTERS },
        { code: 'cacheTag("products:42");', filename: IN_ADAPTERS },
        { code: ["cacheTag(`products:$", "{id}`);"].join(""), filename: IN_ADAPTERS },
        // 綴りが静的に決まらない印は、段の数を見ない。
        { code: "cacheTag(tag);", filename: IN_ADAPTERS },
        // 文字列でない印は、段の数を見ない。
        { code: "cacheTag(1);", filename: IN_ADAPTERS },
        // 名前だけが同じ別の関数を巻き込まない。
        { code: 'addTag("a:b:c");', filename: OUTSIDE_ADAPTERS },
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("段を増やした印を挙げる", () => {
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [],
      invalid: [
        {
          code: 'cacheTag("products:42:reviews");',
          filename: IN_ADAPTERS,
          errors: [{ messageId: "tooManySegments" }],
        },
        {
          code: ["cacheTag(`products:$", "{id}:$", "{page}`);"].join(""),
          filename: IN_ADAPTERS,
          errors: [{ messageId: "tooManySegments" }],
        },
      ],
    });
  });

  it("取得側の外で印を付ける形を挙げる", () => {
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [],
      invalid: [
        {
          code: 'cacheTag("products");',
          filename: OUTSIDE_ADAPTERS,
          errors: [{ messageId: "outsideAdapters" }],
        },
      ],
    });
  });

  it("場所と段の両方が外れていれば、両方を挙げる", () => {
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [],
      invalid: [
        {
          code: 'cacheTag("products:42:reviews");',
          filename: OUTSIDE_ADAPTERS,
          errors: [{ messageId: "outsideAdapters" }, { messageId: "tooManySegments" }],
        },
      ],
    });
  });

  it("接頭辞だけが一致する隣の場所を、取得側と見なさない", () => {
    // `src/adapters` で始まるだけの別ディレクトリ。区切りまで見ないと内側と誤判定する。
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [],
      invalid: [
        {
          code: 'cacheTag("products");',
          filename: "src/adapters-legacy/api.ts",
          errors: [{ messageId: "outsideAdapters" }],
        },
      ],
    });
  });

  it("絶対パスで渡された場所も判定する", () => {
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [{ code: 'cacheTag("products");', filename: resolve(IN_ADAPTERS) }],
      invalid: [],
    });
  });

  it("呼び出しの名前が式で決まる形は見ない", () => {
    ruleTester.run("no-ad-hoc-cache-tag", noAdHocCacheTag, {
      valid: [{ code: 'cache["cacheTag"]("a:b:c");', filename: OUTSIDE_ADAPTERS }],
      invalid: [],
    });
  });
});

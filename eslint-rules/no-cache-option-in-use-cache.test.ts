import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noCacheOptionInUseCache from "./no-cache-option-in-use-cache";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

const CACHED = '"use cache";\n';

describe("noCacheOptionInUseCache", () => {
  // ----- 正常系 -----
  it("宣言を持たないモジュールの取得は見ない", () => {
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [
        'await fetch(url, { cache: "force-cache" });',
        'await fetch(url, { next: { tags: ["products"] } });',
      ],
      invalid: [],
    });
  });

  it("宣言を持つモジュールでも、競合しない指定は通す", () => {
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [
        `${CACHED}await fetch(url);`,
        `${CACHED}await fetch(url, { headers });`,
        `${CACHED}await fetch(url, { method: "POST", body });`,
        // 設定を変数で渡した形は、中身がここでは決まらない。
        `${CACHED}await fetch(url, init);`,
        // 取得でない呼び出しを巻き込まない。
        `${CACHED}collect(url, { cache: "force-cache" });`,
      ],
      invalid: [],
    });
  });

  it("client にしか残らない宣言は対象にしない", () => {
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: ['"use cache: private";\nawait fetch(url, { cache: "force-cache" });'],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("宣言を持つモジュールの `cache` 指定を挙げる", () => {
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [],
      invalid: [
        {
          code: `${CACHED}await fetch(url, { cache: "force-cache" });`,
          errors: [{ messageId: "noCacheOptionInUseCache" }],
        },
      ],
    });
  });

  it("`next` の指定も挙げる", () => {
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [],
      invalid: [
        {
          code: `${CACHED}await fetch(url, { next: { tags: ["products"] } });`,
          errors: [{ messageId: "noCacheOptionInUseCache" }],
        },
      ],
    });
  });

  it("宣言より前に書かれた取得も挙げる", () => {
    // 宣言はモジュールに掛かる。走査の順で取りこぼさないことを固定する。
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [],
      invalid: [
        {
          code: `const run = async () => {\n  "use cache";\n  await fetch(url, { cache: "no-store" });\n};`,
          errors: [{ messageId: "noCacheOptionInUseCache" }],
        },
      ],
    });
  });

  it("引用符で書いた鍵も挙げる", () => {
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [],
      invalid: [
        {
          code: `${CACHED}await fetch(url, { "cache": "force-cache" });`,
          errors: [{ messageId: "noCacheOptionInUseCache" }],
        },
        {
          code: `${CACHED}await fetch(url, { 'next': { tags: [] } });`,
          errors: [{ messageId: "noCacheOptionInUseCache" }],
        },
      ],
    });
  });

  it("式文に置かれた文字列でない値を、宣言として読まない", () => {
    // 式文の直下に来る literal は宣言だけではない。数値も同じ位置に立つ。
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: ['42;\nawait fetch(url, { cache: "force-cache" });'],
      invalid: [],
    });
  });

  it("名前で書いていないプロパティは見ない", () => {
    // 添字で組んだ鍵は、名前がここでは決まらない。
    ruleTester.run("no-cache-option-in-use-cache", noCacheOptionInUseCache, {
      valid: [`${CACHED}await fetch(url, { [key]: "force-cache", ...rest });`],
      invalid: [],
    });
  });
});

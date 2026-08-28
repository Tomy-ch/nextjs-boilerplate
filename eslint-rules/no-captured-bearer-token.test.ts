import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noCapturedBearerToken from "./no-captured-bearer-token";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

const FILENAME = "src/adapters/server/api/users.ts";

const IMPORT_RESOLVER = 'import { getAccessToken } from "../auth/session";\n';

describe("noCapturedBearerToken", () => {
  // ----- 正常系 -----
  it("import した取得口を通す", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        {
          code: `${IMPORT_RESOLVER}const client = createHttpClient({ getBearerToken: getAccessToken });`,
          filename: FILENAME,
        },
        // 短縮記法でも、指しているのは import した口である。
        {
          code: `import { getBearerToken } from "../auth/session";\nconst client = createHttpClient({ getBearerToken });`,
          filename: FILENAME,
        },
      ],
      invalid: [],
    });
  });

  it("受け取る側の分解代入を通す", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [{ code: "function create({ getBearerToken }) { return getBearerToken; }" }],
      invalid: [],
    });
  });

  it("同じ綴りの別物を通す", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        // 計算されたキー。綴りが一致するのは実行時であり、静的には別物と区別が付かない。
        {
          code: `${IMPORT_RESOLVER}const client = createHttpClient({ ["getBearerToken"]: async () => "t" });`,
          filename: FILENAME,
        },
        { code: "const options = { retries: 3, timeout: 100 };", filename: FILENAME },
      ],
      invalid: [],
    });
  });

  it("テストを対象外にする", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        {
          code: 'const client = createHttpClient({ getBearerToken: async () => "token" });',
          filename: "src/adapters/server/api/users.test.ts",
        },
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("その場で組んだ関数を落とす", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [],
      invalid: [
        {
          code: "const client = createHttpClient({ getBearerToken: async () => accessToken });",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedBearerToken" }],
        },
        // 文字列キーでも渡す先は同じ。
        {
          code: 'const client = createHttpClient({ "getBearerToken": async () => accessToken });',
          filename: FILENAME,
          errors: [{ messageId: "noCapturedBearerToken" }],
        },
      ],
    });
  });

  it("ローカルに宣言した口を落とす", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [],
      invalid: [
        {
          code: "const resolve = async () => accessToken;\nconst client = createHttpClient({ getBearerToken: resolve });",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedBearerToken" }],
        },
        // 引数で持ち回った値。解決の経路が呼び出し側へ散る。
        {
          code: "function create(resolve) {\n  return createHttpClient({ getBearerToken: resolve });\n}",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedBearerToken" }],
        },
        // どこにも宣言の無い名前。指す先が読めない以上、import した口とは言えない。
        {
          code: "const client = createHttpClient({ getBearerToken: ambientResolver });",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedBearerToken" }],
        },
      ],
    });
  });
});

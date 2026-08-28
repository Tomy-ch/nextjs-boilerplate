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
          code: 'import { getBearerToken } from "../auth/session";\nconst client = createHttpClient({ getBearerToken });',
          filename: FILENAME,
        },
      ],
      invalid: [],
    });
  });

  it("確立中の口が呼び出しで受け取った引数を通す", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        {
          code: "export function fetchRole(accessToken) {\n  return createHttpClient({ bearerToken: accessToken });\n}",
          filename: "src/adapters/server/api/user-roles.ts",
        },
      ],
      invalid: [],
    });
  });

  it("受け取る側の分解代入を通す", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        {
          code: "function create({ getBearerToken, bearerToken }) { return [getBearerToken, bearerToken]; }",
        },
      ],
      invalid: [],
    });
  });

  it("実行時にしか綴りが決まらないキーを通す", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        {
          code: 'const key = "getBearerToken";\nconst client = createHttpClient({ [key]: async () => "t" });',
          filename: FILENAME,
        },
        { code: "const options = { retries: 3, timeout: 100 };", filename: FILENAME },
        // 綴りを持たないリテラルのキー。文字列でない以上、どの綴りとも名指しが一致しない。
        { code: 'const client = createHttpClient({ 0: async () => "t" });', filename: FILENAME },
      ],
      invalid: [],
    });
  });

  it("テストを対象外にする", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [
        {
          code: 'const client = createHttpClient({ getBearerToken: async () => "token", bearerToken: "token" });',
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
          errors: [{ messageId: "noCapturedResolver" }],
        },
        // 文字列キーでも渡す先は同じ。
        {
          code: 'const client = createHttpClient({ "getBearerToken": async () => accessToken });',
          filename: FILENAME,
          errors: [{ messageId: "noCapturedResolver" }],
        },
        // 括弧で包んでも綴りは確定している。ここを通すと、書き方を変えるだけで規則が外れる。
        {
          code: 'const client = createHttpClient({ ["getBearerToken"]: async () => accessToken });',
          filename: FILENAME,
          errors: [{ messageId: "noCapturedResolver" }],
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
          errors: [{ messageId: "noCapturedResolver" }],
        },
        // 引数で持ち回った口。解決の経路が呼び出し側へ散る。
        {
          code: "function create(resolve) {\n  return createHttpClient({ getBearerToken: resolve });\n}",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedResolver" }],
        },
        // どこにも宣言の無い名前。指す先が読めない以上、import した口とは言えない。
        {
          code: "const client = createHttpClient({ getBearerToken: ambientResolver });",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedResolver" }],
        },
      ],
    });
  });

  it("確立中の口が掴んだ値を受け取る形を落とす", () => {
    ruleTester.run("no-captured-bearer-token", noCapturedBearerToken, {
      valid: [],
      invalid: [
        // モジュール変数。最初の要求の資格情報がプロセスの寿命だけ居座る。
        {
          code: "let cached;\nfunction getClient() {\n  return createHttpClient({ bearerToken: cached });\n}",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedToken" }],
        },
        // import した値。呼び出しと一緒には届かない。
        {
          code: 'import { token } from "./token";\nconst client = createHttpClient({ bearerToken: token });',
          filename: FILENAME,
          errors: [{ messageId: "noCapturedToken" }],
        },
        // 式で組んだ値。
        {
          code: "const client = createHttpClient({ bearerToken: readToken() });",
          filename: FILENAME,
          errors: [{ messageId: "noCapturedToken" }],
        },
      ],
    });
  });
});

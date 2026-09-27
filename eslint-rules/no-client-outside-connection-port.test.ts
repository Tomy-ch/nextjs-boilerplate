import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import { CONNECTION_PORTS } from "../architecture";
import noClientOutsideConnectionPort from "./no-client-outside-connection-port";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

/** 接続口ではない、組み立ての kernel の隣の区画に置いたファイル。 */
const FILENAME = "src/adapters/server/auth/example.ts";

/** FILENAME から見た、組み立ての kernel の綴り。 */
const FACTORY = "../http/request";

/** client 側の要求境界に置いたファイル。同じ綴りが別の実ファイルを指す。 */
const CLIENT_FILENAME = "src/adapters/client/api/example.ts";

const ERROR = { messageId: "noClientOutsideConnectionPort" };

describe("noClientOutsideConnectionPort", () => {
  // ----- 正常系 -----
  it("接続口では組み立ての関数を引ける", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: CONNECTION_PORTS.map((port) => ({
        code: 'import { createHttpClient } from "./request";',
        filename: port,
      })),
      invalid: [],
    });
  });

  it("テストでは組み立ての関数を引ける", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: [
        {
          code: `import { createHttpClient } from "${FACTORY}";`,
          filename: "src/adapters/server/auth/example.test.ts",
        },
      ],
      invalid: [],
    });
  });

  it("型だけの import と、組み立ての関数でない名前を通す", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: [
        { code: `import type { UserScopedHttpClient } from "${FACTORY}";`, filename: FILENAME },
        { code: `import { type createHttpClient } from "${FACTORY}";`, filename: FILENAME },
        { code: `import { buildUrl } from "${FACTORY}";`, filename: FILENAME },
        { code: `export type { PublicHttpClient } from "${FACTORY}";`, filename: FILENAME },
        { code: `export { type createHttpClient } from "${FACTORY}";`, filename: FILENAME },
        { code: `export { buildUrl } from "${FACTORY}";`, filename: FILENAME },
        { code: `export type * from "${FACTORY}";`, filename: FILENAME },
        { code: "const value = 1;\nexport { value };", filename: FILENAME },
      ],
      invalid: [],
    });
  });

  it("別の実ファイルへ解決する同じ綴りと、kernel 以外への import を通す", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: [
        // client 側の要求境界。綴りは同じだが、解決した先が組み立ての kernel ではない。
        { code: 'import { createHttpClient } from "../http/request";', filename: CLIENT_FILENAME },
        { code: 'import { createHttpClient } from "./session";', filename: FILENAME },
        { code: 'import { z } from "zod";', filename: FILENAME },
        { code: 'const loaded = await import("./session");', filename: FILENAME },
        { code: "const loaded = await import(specifier);", filename: FILENAME },
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("接続口の外で組み立ての関数を引く import を落とす", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: [],
      invalid: [
        { code: `import { createHttpClient } from "${FACTORY}";`, filename: FILENAME, errors: [ERROR] },
        // 別名で受けても、kernel 側の名前で判定する。
        {
          code: `import { createHttpClient as build } from "${FACTORY}";`,
          filename: FILENAME,
          errors: [ERROR],
        },
        // 文字列の名前で指しても同じ。
        {
          code: `import { "createHttpClient" as build } from "${FACTORY}";`,
          filename: FILENAME,
          errors: [ERROR],
        },
        // 名前空間は組み立ての関数を含む。
        { code: `import * as http from "${FACTORY}";`, filename: FILENAME, errors: [ERROR] },
        // 別名の綴りでも、解決した先で判定する。
        {
          code: 'import { createHttpClient } from "@/adapters/server/http/request";',
          filename: FILENAME,
          errors: [ERROR],
        },
      ],
    });
  });

  it("組み立ての関数を再 export して外へ渡す形を落とす", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: [],
      invalid: [
        { code: `export { createHttpClient } from "${FACTORY}";`, filename: FILENAME, errors: [ERROR] },
        { code: `export * from "${FACTORY}";`, filename: FILENAME, errors: [ERROR] },
      ],
    });
  });

  it("組み立ての kernel を動的に読み込む形を落とす", () => {
    ruleTester.run("no-client-outside-connection-port", noClientOutsideConnectionPort, {
      valid: [],
      invalid: [
        { code: `const http = await import("${FACTORY}");`, filename: FILENAME, errors: [ERROR] },
      ],
    });
  });
});

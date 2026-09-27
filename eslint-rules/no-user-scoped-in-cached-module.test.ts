import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

import noUserScopedInCachedModule from "./no-user-scoped-in-cached-module";

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

const FILENAME = "src/features/resources/list/page-content.ts";

/** 分類を宣言している実在のモジュール。写しではなく宣言そのものを読ませる。 */
const USER_SCOPED = "@/adapters/server/http/request";

/** 分類を宣言していない実在のモジュール。 */
const UNCLASSIFIED = "@/adapters/server/http/search-params";

/**
 * 自分では分類を宣言せず、相対の import で引く 1 段先が user-scoped を宣言している実在のモジュール。
 * 1 段先は 1 段目のファイルを起点に解決しないと届かない。
 */
const REACHES_USER_SCOPED = "@/adapters/server/auth/resolver";

/** 公開を宣言し、1 段先には client を組む kernel しか引いていない実在のモジュール。 */
const PUBLIC_VIA_FACTORY = "@/adapters/server/auth/oidc-discovery";

describe("noUserScopedInCachedModule", () => {
  // ----- 正常系 -----
  it("キャッシュを宣言していないモジュールを通す", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [{ code: `import { createHttpClient } from "${USER_SCOPED}";`, filename: FILENAME }],
      invalid: [],
    });
  });

  it("ブラウザにしか載らないキャッシュを通す", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [
        {
          code: `"use cache: private";\nimport { createHttpClient } from "${USER_SCOPED}";`,
          filename: FILENAME,
        },
      ],
      invalid: [],
    });
  });

  it("分類を宣言していない import を通す", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [
        {
          code: `"use cache";\nimport { toSearchParams } from "${UNCLASSIFIED}";`,
          filename: FILENAME,
        },
        // 依存パッケージ。このリポジトリのソースではないので解決しない。
        { code: '"use cache";\nimport { z } from "zod";', filename: FILENAME },
        // 実体の無い相対 import。解決できないものは判定材料を持たない。
        { code: '"use cache";\nimport { x } from "./missing-module";', filename: FILENAME },
      ],
      invalid: [],
    });
  });

  it("1 段先に client を組む kernel しか持たない import を通す", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [
        {
          code: `"use cache";\nimport { fetchOidcEndpoints } from "${PUBLIC_VIA_FACTORY}";`,
          filename: FILENAME,
        },
      ],
      invalid: [],
    });
  });

  // ----- 異常系 -----
  it("キャッシュを持つモジュールからの user-scoped な import を落とす", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [],
      invalid: [
        {
          code: `"use cache";\nimport { createHttpClient } from "${USER_SCOPED}";`,
          filename: FILENAME,
          errors: [{ messageId: "noUserScopedInCachedModule" }],
        },
        // 相対でも同じ。綴りの違いで判定が変わらない。
        {
          code: '"use cache";\nimport { createHttpClient } from "../../../adapters/server/http/request";',
          filename: FILENAME,
          errors: [{ messageId: "noUserScopedInCachedModule" }],
        },
      ],
    });
  });

  it("1 段先が相対 import で引く user-scoped な口を、1 段目のファイルを起点に辿って落とす", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [],
      invalid: [
        {
          code: `"use cache";\nimport { getSessionResolver } from "${REACHES_USER_SCOPED}";`,
          filename: FILENAME,
          errors: [{ messageId: "noUserScopedInCachedModule" }],
        },
      ],
    });
  });

  it("関数の中のキャッシュ宣言も見る", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [],
      invalid: [
        {
          code: `import { createHttpClient } from "${USER_SCOPED}";\nasync function load() {\n  "use cache";\n  return createHttpClient;\n}`,
          filename: FILENAME,
          errors: [{ messageId: "noUserScopedInCachedModule" }],
        },
      ],
    });
  });

  it("サーバへ保存される profile 付きのキャッシュも落とす", () => {
    ruleTester.run("no-user-scoped-in-cached-module", noUserScopedInCachedModule, {
      valid: [],
      invalid: [
        {
          code: `"use cache: remote";\nimport { createHttpClient } from "${USER_SCOPED}";`,
          filename: FILENAME,
          errors: [{ messageId: "noUserScopedInCachedModule" }],
        },
      ],
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  findUnguardedServerModules,
  formatUnguardedServerModules,
  type ServerModule,
} from "./server-only";

function modules(...entries: readonly [string, string][]): ServerModule[] {
  return entries.map(([path, content]) => ({ path, content }));
}

describe("findUnguardedServerModules", () => {
  // 番人が揃っていることがハッピーパスで、欠けている module を挙げるのが契約の外側の側。
  // 挙げるか挙げないかで分けており、綴りの解釈が難しいかどうかでは分けない。

  // ----- 正常系 -----
  it("番人を import の先頭に持つ module は挙げない", () => {
    const found = findUnguardedServerModules(
      modules([
        "src/config/api/api.server.ts",
        'import "server-only";\n\nimport { z } from "zod";\n',
      ]),
    );

    expect(found).toEqual([]);
  });

  it("番人だけを引く module も挙げない", () => {
    const found = findUnguardedServerModules(
      modules(["src/logging/pino.server.ts", 'import "server-only";\n\nexport const a = 1;\n']),
    );

    expect(found).toEqual([]);
  });

  it("server を名乗らない module は綴りで外れる", () => {
    const found = findUnguardedServerModules(
      modules(["src/adapters/server/http/request.ts", 'import { z } from "zod";\n']),
    );

    expect(found).toEqual([]);
  });

  it("番人より前の doc コメントは import ではないので許す", () => {
    const found = findUnguardedServerModules(
      modules(["src/config/doc.server.ts", '/** 説明。 */\nimport "server-only";\n']),
    );

    expect(found).toEqual([]);
  });

  it("コメントの中の import らしき行は import として数えない", () => {
    const found = findUnguardedServerModules(
      modules([
        "src/config/commented.server.ts",
        '/*\nimport { a } from "./a";\n*/\nimport "server-only";\n',
      ]),
    );

    expect(found).toEqual([]);
  });

  it("引き先を持たない `export {}` は import として数えない", () => {
    const found = findUnguardedServerModules(
      modules([
        "src/config/local.server.ts",
        'const a = 1;\nexport { a };\nimport "server-only";\n',
      ]),
    );

    expect(found).toEqual([]);
  });

  it("引き先の綴りが壊れている文は import として数えない", () => {
    const found = findUnguardedServerModules(
      modules(["src/config/broken.server.ts", 'import { a } from bad;\nimport "server-only";\n']),
    );

    expect(found).toEqual([]);
  });

  // ----- 異常系 -----
  it("番人が無い module を missing として挙げる", () => {
    const found = findUnguardedServerModules(
      modules(["src/config/validate-environment.server.ts", 'import { a } from "./a";\n']),
    );

    expect(found).toEqual([
      { path: "src/config/validate-environment.server.ts", reason: "missing" },
    ]);
  });

  it("tsx の綴りも対象にする", () => {
    const found = findUnguardedServerModules(
      modules(["src/features/a/view.server.tsx", "export const a = 1;\n"]),
    );

    expect(found).toEqual([{ path: "src/features/a/view.server.tsx", reason: "missing" }]);
  });

  it("`server-only` を名前付きで引く形は番人と見なさない", () => {
    const found = findUnguardedServerModules(
      modules(["src/config/named.server.ts", 'import x from "server-only";\n']),
    );

    expect(found).toEqual([{ path: "src/config/named.server.ts", reason: "missing" }]);
  });

  it("番人が他の import より後ろにある module を not-first として挙げる", () => {
    const found = findUnguardedServerModules(
      modules(["src/config/late.server.ts", 'import { a } from "./a";\nimport "server-only";\n']),
    );

    expect(found).toEqual([{ path: "src/config/late.server.ts", reason: "not-first" }]);
  });

  it("複数行にまたがる import が番人より前にあれば not-first として挙げる", () => {
    const found = findUnguardedServerModules(
      modules([
        "src/config/wrapped.server.ts",
        'import {\n  a,\n  b,\n} from "./a";\n\nimport "server-only";\n',
      ]),
    );

    expect(found).toEqual([{ path: "src/config/wrapped.server.ts", reason: "not-first" }]);
  });

  it("`export ... from` も import と同じく番人より前を禁じる", () => {
    const found = findUnguardedServerModules(
      modules([
        "src/config/reexport.server.ts",
        'export { a } from "./a";\nimport "server-only";\n',
      ]),
    );

    expect(found).toEqual([{ path: "src/config/reexport.server.ts", reason: "not-first" }]);
  });
});

describe("formatUnguardedServerModules", () => {
  // ----- 正常系 -----
  it("欠け方を綴り分けて 1 行ずつ並べる", () => {
    const text = formatUnguardedServerModules([
      { path: "src/b.server.ts", reason: "not-first" },
      { path: "src/a.server.ts", reason: "missing" },
    ]);

    expect(text).toBe(
      'src/a.server.ts: import "server-only" がありません\n' +
        'src/b.server.ts: import "server-only" が import の先頭にありません',
    );
  });

  it("違反が無ければ空文字を返す", () => {
    expect(formatUnguardedServerModules([])).toBe("");
  });
});

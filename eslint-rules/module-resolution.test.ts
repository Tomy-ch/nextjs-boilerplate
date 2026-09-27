import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { moduleSpecifiers, resolveModule } from "./module-resolution";

const CWD = process.cwd();

/** 起点に使う実在のファイル。 */
const FROM = resolve(CWD, "src/adapters/server/auth/resolver.ts");

describe("resolveModule", () => {
  // ----- 正常系 -----
  it("別名の綴りをリポジトリのソースへ解決する", () => {
    expect(resolveModule("@/adapters/server/http/request", FROM, CWD)).toBe(
      resolve(CWD, "src/adapters/server/http/request.ts"),
    );
  });

  it("相対の綴りを、綴りを書いたファイルを起点に解決する", () => {
    expect(resolveModule("./default-session-resolver", FROM, CWD)).toBe(
      resolve(CWD, "src/adapters/server/auth/default-session-resolver.ts"),
    );
  });

  // ----- 異常系 -----
  it("素の package 名は解決しない", () => {
    expect(resolveModule("zod", FROM, CWD)).toBeUndefined();
  });

  it("実体の無い綴りは解決しない", () => {
    expect(resolveModule("./missing-module", FROM, CWD)).toBeUndefined();
  });
});

describe("moduleSpecifiers", () => {
  // ----- 正常系 -----
  it("静的な import と再 export の綴りを拾う", () => {
    const source = 'import { a } from "./a";\nexport { b } from "@/b";\nexport * from "../c";';

    expect(moduleSpecifiers(source)).toEqual(["./a", "@/b", "../c"]);
  });

  it("副作用だけの import と動的な import の綴りを拾う", () => {
    const source = 'import "server-only";\nconst m = await import("./lazy");';

    expect(moduleSpecifiers(source)).toEqual(["server-only", "./lazy"]);
  });

  it("複数行にまたがる import の綴りを拾う", () => {
    const source = 'import {\n  a,\n  type B,\n} from "./many";';

    expect(moduleSpecifiers(source)).toEqual(["./many"]);
  });

  // ----- 異常系 -----
  it("モジュールを指さないソースからは何も拾わない", () => {
    expect(moduleSpecifiers("const from = 1;")).toEqual([]);
  });
});

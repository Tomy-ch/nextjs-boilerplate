import { describe, expect, it } from "vitest";

import { findSecretReferences } from "./secret-reference";

/** `${{ body }}` の式を組み立てる。 */
const expr = (body: string): string => `\${{ ${body} }}`;

describe("findSecretReferences", () => {
  // ----- 正常系 -----
  it("ドット記法の参照を名前とオフセット付きで返す", () => {
    expect(findSecretReferences(expr("secrets.GITHUB_TOKEN"))).toEqual([
      { offset: 4, name: "GITHUB_TOKEN" },
    ]);
  });

  it("二重引用符の角括弧記法から名前を取り出す", () => {
    expect(findSecretReferences(expr('secrets["MY_TOKEN"]'))).toEqual([
      { offset: 4, name: "MY_TOKEN" },
    ]);
  });

  it("単引用符の角括弧記法は、名前を伏せたまま参照として拾う", () => {
    expect(findSecretReferences(expr("secrets['MY_TOKEN']"))).toEqual([{ offset: 4, name: null }]);
  });

  it("大文字小文字を区別せずコンテキストを拾う", () => {
    expect(findSecretReferences(expr("SECRETS.FOO"))).toEqual([{ offset: 4, name: "FOO" }]);
  });

  it("コンテキスト全体の参照は名前を null で返す", () => {
    expect(findSecretReferences(expr("toJSON(secrets)"))).toEqual([{ offset: 11, name: null }]);
  });

  it("1 つのテキストに複数の式があればすべて返す", () => {
    expect(findSecretReferences(`${expr("secrets.A")}${expr("secrets.B")}`)).toEqual([
      { offset: 4, name: "A" },
      { offset: 20, name: "B" },
    ]);
  });

  it("文字列リテラルに }} を含む式でも、その先の参照を見落とさない", () => {
    expect(findSecretReferences(expr("format('}}', secrets.TOKEN)"))).toEqual([
      { offset: 17, name: "TOKEN" },
    ]);
  });

  it("閉じない式では末尾までを 1 つの式として扱う", () => {
    expect(findSecretReferences(expr("secrets.TOKEN").slice(0, -3))).toEqual([
      { offset: 4, name: "TOKEN" },
    ]);
  });

  // ----- 異常系 -----
  it("式の外に書かれた secrets を参照として扱わない", () => {
    expect(findSecretReferences("secrets.TOKEN は式の外")).toEqual([]);
  });

  it("式中の文字列リテラルに書かれた secrets を参照として扱わない", () => {
    expect(findSecretReferences(expr("'secrets.TOKEN'"))).toEqual([]);
  });

  it("別語の一部としての secrets を参照として扱わない", () => {
    expect(findSecretReferences(expr("my-secrets.TOKEN"))).toEqual([]);
    expect(findSecretReferences(expr("secretsfoo"))).toEqual([]);
  });

  it("式を含まないテキストでは空を返す", () => {
    expect(findSecretReferences("ただの本文")).toEqual([]);
  });
});

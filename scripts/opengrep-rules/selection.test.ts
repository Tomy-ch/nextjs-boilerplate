import { describe, expect, it } from "vitest";

import { selectRuleMembers } from "./selection";

/** codeload の tarball が持つ形（先頭 1 段が `<repo>-<commit>/`）でメンバーを組み立てる。 */
const member = (rest: string): string => `opengrep-rules-abc123/${rest}`;

describe("selectRuleMembers", () => {
  // ----- 正常系 -----
  it("javascript / typescript の security ルールを取り出す", () => {
    const members = [
      member("javascript/lang/security/xss.yaml"),
      member("typescript/react/security/href.yml"),
    ];

    expect(selectRuleMembers(members)).toEqual(members);
  });

  it("段の深さが違っても security の下なら取り出す", () => {
    const deep = member("javascript/express/security/injection/eval.yaml");

    expect(selectRuleMembers([deep])).toEqual([deep]);
  });

  it("列挙順に依らず辞書順で返す", () => {
    const first = member("javascript/lang/security/a.yaml");
    const second = member("javascript/lang/security/b.yaml");

    expect(selectRuleMembers([second, first])).toEqual([first, second]);
  });

  // ----- 異常系 -----
  it("security の下の audit は捨てる", () => {
    const audit = member("javascript/lang/security/audit/detect-redos.yaml");

    expect(selectRuleMembers([audit])).toEqual([]);
  });

  it("security 以外の分類は取り出さない", () => {
    const members = [
      member("javascript/lang/best-practice/x.yaml"),
      member("typescript/react/portability/y.yaml"),
    ];

    expect(selectRuleMembers(members)).toEqual([]);
  });

  it("対象外の言語は取り出さない", () => {
    const members = [
      member("java/lang/security/webshell.yaml"),
      member("php/lang/security/rce.yaml"),
    ];

    expect(selectRuleMembers(members)).toEqual([]);
  });

  it("ルールでないファイルは取り出さない", () => {
    const members = [
      member("javascript/lang/security/xss.js"),
      member("javascript/lang/security/README.md"),
    ];

    expect(selectRuleMembers(members)).toEqual([]);
  });

  it("ファイル名に分類名を含むだけのものを取り出さない", () => {
    const named = member("javascript/lang/best-practice/security.yaml");

    expect(selectRuleMembers([named])).toEqual([]);
  });

  it("段が足りないメンバーを取り出さない", () => {
    const members = [member("javascript"), member("javascript/security.yaml"), "LICENSE"];

    expect(selectRuleMembers(members)).toEqual([]);
  });

  it("ディレクトリのエントリを取り出さない", () => {
    const directory = member("javascript/lang/security/");

    expect(selectRuleMembers([directory])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { parseLabels } from "./labels";

describe("parseLabels", () => {
  // ----- 正常系 -----
  it("ラベル名の一覧をそのまま読む", () => {
    expect(parseLabels('["run-a11y","run-e2e"]')).toStrictEqual(["run-a11y", "run-e2e"]);
  });

  it("1 枚も付いていない PR は空になる", () => {
    expect(parseLabels("[]")).toStrictEqual([]);
  });

  it("渡されていなければ空として読む", () => {
    expect(parseLabels(undefined)).toStrictEqual([]);
  });

  // ----- 異常系 -----
  it("pull_request 以外のイベントが書く null は、1 枚も付いていない扱いになる", () => {
    expect(parseLabels("null")).toStrictEqual([]);
  });

  it("配列でない JSON は、1 枚も付いていない扱いになる", () => {
    expect(parseLabels('{"name":"run-e2e"}')).toStrictEqual([]);
  });

  it("JSON として読めなければ、1 枚も付いていない扱いになる", () => {
    expect(parseLabels("[run-e2e")).toStrictEqual([]);
  });

  it("ラベル名でない要素は落とす", () => {
    expect(parseLabels('["run-e2e",1,null,{"a":1}]')).toStrictEqual(["run-e2e"]);
  });
});

import { describe, expect, it } from "vitest";

import { toCartLineOrder } from "./line-order";

describe("toCartLineOrder", () => {
  // ----- 正常系 -----
  it("覚えている並びが無いとき、いま並んでいる順をそのまま返す", () => {
    expect(toCartLineOrder([], ["a", "b"], new Set())).toEqual(["a", "b"]);
  });

  it("取り除いた明細を、覚えている並びの位置に残す", () => {
    expect(toCartLineOrder(["a", "b", "c"], ["a", "c"], new Set(["b"]))).toEqual(["a", "b", "c"]);
  });

  it("続けて取り除いた明細を、それぞれの位置に残す", () => {
    expect(toCartLineOrder(["a", "b", "c"], ["c"], new Set(["a", "b"]))).toEqual(["a", "b", "c"]);
  });

  it("後から入った明細を末尾へ回す", () => {
    expect(toCartLineOrder(["a", "b"], ["a", "b", "z"], new Set())).toEqual(["a", "b", "z"]);
  });

  it("戻せなくなった明細を並びから落とす", () => {
    expect(toCartLineOrder(["a", "b", "c"], ["a", "c"], new Set())).toEqual(["a", "c"]);
  });

  it("いま並んでいる明細が 1 件も無くても、戻せる明細は位置を保つ", () => {
    expect(toCartLineOrder(["a", "b"], [], new Set(["a", "b"]))).toEqual(["a", "b"]);
  });

  // ----- 異常系 -----
  it("覚えている並びに無い明細だけが残ったとき、いまの順を返す", () => {
    expect(toCartLineOrder(["a"], ["y", "z"], new Set())).toEqual(["y", "z"]);
  });
});

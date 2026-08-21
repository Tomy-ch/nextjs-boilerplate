import { describe, expect, it } from "vitest";

import { toUserId } from "./user";

const RAW_ID = "0195f0c2-0000-7000-8000-000000000001";

describe("toUserId", () => {
  it("受け取った文字列をそのまま識別子として返す", () => {
    expect(toUserId(RAW_ID)).toBe(RAW_ID);
  });

  it("実在するかは検査しない。確定させるのは識別子の種類だけ", () => {
    expect(toUserId("まだ存在しない")).toBe("まだ存在しない");
  });

  it("brand を付けても JSON を跨いだ値は素の文字列のまま変わらない", () => {
    const row = { userId: toUserId(RAW_ID) };

    expect(JSON.parse(JSON.stringify(row))).toEqual({ userId: RAW_ID });
  });
});

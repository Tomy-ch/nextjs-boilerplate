import { describe, expect, it } from "vitest";

import type { ManagedUser } from "@/model/user/user";
import { toUserId } from "@/model/user/user";

import { toAdminUserRows } from "./row";

const ID = toUserId("0195f0c2-0000-7000-8000-000000000001");

function user(overrides: Partial<ManagedUser> = {}): ManagedUser {
  return {
    id: ID,
    firstName: "太郎",
    lastName: "山田",
    email: "yamada@example.com",
    phone: "09012345678",
    deletedAt: null,
    ...overrides,
  };
}

describe("toAdminUserRows", () => {
  // ----- 正常系 -----
  it("姓・名の順に並べた表示名を組む", () => {
    expect(toAdminUserRows([user()])[0]).toEqual({
      id: ID,
      name: "山田 太郎",
      email: "yamada@example.com",
      phone: "09012345678",
      withdrawn: false,
    });
  });

  it("退会日時を持つ利用者を、退会済みとして印す", () => {
    expect(toAdminUserRows([user({ deletedAt: "2026-08-01T00:00:00Z" })])[0]?.withdrawn).toBe(true);
  });

  it("退会日時そのものは一覧へ運ばない", () => {
    expect(toAdminUserRows([user({ deletedAt: "2026-08-01T00:00:00Z" })])[0]).not.toHaveProperty(
      "deletedAt",
    );
  });

  it("受け取った順序をそのまま保つ", () => {
    const rows = toAdminUserRows([user(), user({ lastName: "佐藤", firstName: "花子" })]);

    expect(rows.map((row) => row.name)).toEqual(["山田 太郎", "佐藤 花子"]);
  });

  it("1 件も無ければ空の並びを返す", () => {
    expect(toAdminUserRows([])).toEqual([]);
  });
});

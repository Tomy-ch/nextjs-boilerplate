import { describe, expect, it } from "vitest";

import { type ManagedUser, toUserId } from "@/model/user/user";

import { toIssueRecipient } from "./recipient";

const USER: ManagedUser = {
  id: toUserId("0195f0c2-0000-7000-8000-000000000001"),
  firstName: "太郎",
  lastName: "山田",
  email: "yamada@example.com",
  phone: "090-0000-0000",
  deletedAt: null,
};

describe("toIssueRecipient", () => {
  // ----- 正常系 -----
  it("識別子・表示名・メールだけを写し、在籍していれば退会していないと持つ", () => {
    expect(toIssueRecipient(USER)).toStrictEqual({
      id: USER.id,
      name: "山田 太郎",
      email: "yamada@example.com",
      withdrawn: false,
    });
  });

  it("退会した日時があれば、退会したと持つ", () => {
    expect(toIssueRecipient({ ...USER, deletedAt: "2026-10-01T00:00:00.000Z" }).withdrawn).toBe(
      true,
    );
  });
});

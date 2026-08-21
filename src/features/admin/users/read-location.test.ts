import { describe, expect, it } from "vitest";

import { MANAGED_USER_PAGE_MAX } from "@/adapters/server/api/users";

import { USER_SCOPE } from "./query";
import { toAdminUserListLocation } from "./read-location";

/** 契約が受け付けるページ番号の上限。取得の口が公開するものを、呼び出し側と同じ形で渡す。 */
const PAGE_MAX = MANAGED_USER_PAGE_MAX;

describe("toAdminUserListLocation", () => {
  // ----- 正常系 -----
  it("条件が無ければ、すべての先頭ページとして読む", () => {
    expect(toAdminUserListLocation({}, PAGE_MAX)).toEqual({ scope: USER_SCOPE.ALL, page: 1 });
  });

  it("範囲とページ番号を読む", () => {
    expect(toAdminUserListLocation({ scope: "withdrawn", page: "3" }, PAGE_MAX)).toEqual({
      scope: USER_SCOPE.WITHDRAWN,
      page: 3,
    });
  });

  // ----- 異常系 -----
  it("1 つしか受け取らない条件が繰り返されていたら、既定へ倒す", () => {
    expect(toAdminUserListLocation({ scope: ["active", "withdrawn"] }, PAGE_MAX).scope).toBe(
      USER_SCOPE.ALL,
    );
  });

  it("宣言に無い範囲は、すべてへ倒す", () => {
    expect(toAdminUserListLocation({ scope: "banned" }, PAGE_MAX).scope).toBe(USER_SCOPE.ALL);
  });

  it("1 を下回るページ番号は、先頭へ倒す", () => {
    expect(toAdminUserListLocation({ page: "0" }, PAGE_MAX).page).toBe(1);
  });

  it("整数でないページ番号は、先頭へ倒す", () => {
    expect(toAdminUserListLocation({ page: "2.5" }, PAGE_MAX).page).toBe(1);
  });

  it("数として読めないページ番号は、先頭へ倒す", () => {
    expect(toAdminUserListLocation({ page: "さいご" }, PAGE_MAX).page).toBe(1);
  });

  it("契約が受け付ける上限そのものは通す", () => {
    expect(toAdminUserListLocation({ page: String(PAGE_MAX) }, PAGE_MAX).page).toBe(PAGE_MAX);
  });

  it("契約の上限を超えるページ番号は、先頭へ倒す", () => {
    // 倒さずに送ると、取得の口が契約の検証で弾き、一覧の代わりにエラーの面が出る。
    expect(toAdminUserListLocation({ page: String(PAGE_MAX + 1) }, PAGE_MAX).page).toBe(1);
  });
});

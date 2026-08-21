import { describe, expect, it } from "vitest";

import { MANAGED_USER_PAGE_MAX } from "@/adapters/server/api/users";

import { ADMIN_USER_LIST_PATH } from "../paths";
import {
  toActiveParam,
  toAdminUserListLocation,
  toScopeHref,
  toUserListHref,
  USER_SCOPE,
} from "./query";

describe("toActiveParam", () => {
  // ----- 正常系 -----
  it("有効だけの範囲を、契約の真へ写す", () => {
    expect(toActiveParam(USER_SCOPE.ACTIVE)).toBe(true);
  });

  it("退会済みだけの範囲を、契約の偽へ写す", () => {
    expect(toActiveParam(USER_SCOPE.WITHDRAWN)).toBe(false);
  });

  it("区別しない範囲は、条件そのものを送らない", () => {
    expect(toActiveParam(USER_SCOPE.ALL)).toBeUndefined();
  });
});

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

describe("toUserListHref", () => {
  // ----- 正常系 -----
  it("既定の場所は、条件を載せない住所にする", () => {
    expect(toUserListHref({ scope: USER_SCOPE.ALL, page: 1 })).toBe(ADMIN_USER_LIST_PATH);
  });

  it("既定でない範囲を載せる", () => {
    expect(toUserListHref({ scope: USER_SCOPE.ACTIVE, page: 1 })).toBe(
      `${ADMIN_USER_LIST_PATH}?scope=active`,
    );
  });

  it("先頭以外のページ番号を載せる", () => {
    expect(toUserListHref({ scope: USER_SCOPE.ALL, page: 3 })).toBe(
      `${ADMIN_USER_LIST_PATH}?page=3`,
    );
  });

  it("範囲とページ番号を併せて載せる", () => {
    expect(toUserListHref({ scope: USER_SCOPE.WITHDRAWN, page: 2 })).toBe(
      `${ADMIN_USER_LIST_PATH}?scope=withdrawn&page=2`,
    );
  });
});

describe("toScopeHref", () => {
  // ----- 正常系 -----
  it("範囲を選び直した先は、その範囲の先頭ページを指す", () => {
    expect(toScopeHref(USER_SCOPE.WITHDRAWN)).toBe(`${ADMIN_USER_LIST_PATH}?scope=withdrawn`);
  });

  it("すべてへ戻したときは、条件の無い住所へ戻る", () => {
    expect(toScopeHref(USER_SCOPE.ALL)).toBe(ADMIN_USER_LIST_PATH);
  });
});

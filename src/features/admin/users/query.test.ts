import { describe, expect, it } from "vitest";

import { ADMIN_USER_LIST_PATH } from "../paths";
import { toActiveParam, toScopeHref, toUserListHref, USER_SCOPE } from "./query";

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

import { ADMIN_USER_LIST_PATH } from "../paths";

/** 絞り込みとページ位置を載せる URL のキー。読む側（`read-location.ts`）と組む側が共有する。 */
export const USER_LIST_KEY: Readonly<{ SCOPE: "scope"; PAGE: "page" }> = {
  SCOPE: "scope",
  PAGE: "page",
};

/**
 * 一覧が対象にする利用者の範囲。
 *
 * @remarks
 * 契約の `active` は真偽値と未指定の 3 値ですが、URL には名前で載せます。`active=false` は
 * 「退会済みだけ」を指しますが、URL を読んだ人にはそう読めません。
 */
export const USER_SCOPE = {
  /** 退会済みを含む全員。 */
  ALL: "all",
  /** 退会していない利用者だけ。 */
  ACTIVE: "active",
  /** 退会済みだけ。 */
  WITHDRAWN: "withdrawn",
} as const;

/** 一覧が対象にする利用者の範囲。 */
export type UserScope = (typeof USER_SCOPE)[keyof typeof USER_SCOPE];

/** 範囲の呼び名。選択欄と、効いている条件の表示が同じものを使う。 */
export const USER_SCOPE_LABELS = {
  [USER_SCOPE.ALL]: "すべて",
  [USER_SCOPE.ACTIVE]: "有効",
  [USER_SCOPE.WITHDRAWN]: "退会済み",
} as const satisfies Readonly<Record<UserScope, string>>;

/** 範囲を、契約が受け取る `active` へ直す。区別しないなら省く。 */
export function toActiveParam(scope: UserScope): boolean | undefined {
  if (scope === USER_SCOPE.ACTIVE) return true;
  if (scope === USER_SCOPE.WITHDRAWN) return false;

  return undefined;
}

/** 一覧の先頭ページ。読めないページ番号はここへ倒す。 */
export const FIRST_PAGE = 1;

/** 一覧の URL が表す、いま見ている場所。 */
export type AdminUserListLocation = {
  readonly scope: UserScope;
  /** 1 から数えるページ番号。 */
  readonly page: number;
};

/**
 * 一覧の URL を組む。
 *
 * @remarks
 * 既定の値は載せません。`?scope=all&page=1` と `/admin/users` は同じ場所を指しており、両方が
 * 出回ると同じ一覧に 2 つの住所ができます。
 */
export function toUserListHref(location: AdminUserListLocation): string {
  const params = new URLSearchParams();

  if (location.scope !== USER_SCOPE.ALL) {
    params.set(USER_LIST_KEY.SCOPE, location.scope);
  }

  if (location.page > 1) {
    params.set(USER_LIST_KEY.PAGE, location.page.toString());
  }

  return params.size === 0 ? ADMIN_USER_LIST_PATH : `${ADMIN_USER_LIST_PATH}?${params.toString()}`;
}

/**
 * 範囲を選び直した先の URL を組む。
 *
 * @remarks
 * ページ位置は捨てます。前の範囲の 3 ページ目は、新しい範囲では別の人たちを指します。
 */
export function toScopeHref(scope: UserScope): string {
  return toUserListHref({ scope, page: 1 });
}

/**
 * 利用者の次の行動が変わる、認証・認可の状態。
 *
 * @see Storybook `Feedback/AuthStateFeedback`
 */
export const AUTH_STATE = {
  /** まだサインインしていない。401。 */
  UNAUTHENTICATED: "unauthenticated",
  /** サインイン済みだったが有効期限が切れた。401。 */
  SESSION_EXPIRED: "session-expired",
  /** サインイン済みだが権限が足りない。403。 */
  FORBIDDEN: "forbidden",
  /** 資源が存在しない、または存在を伏せている。404。 */
  NOT_FOUND: "not-found",
} as const;

/** {@link AUTH_STATE} の値。 */
export type AuthState = (typeof AUTH_STATE)[keyof typeof AUTH_STATE];

/** 既定の見出しと説明。呼び出し元は props で差し替えられる。 */
export const AUTH_STATE_MESSAGE: Record<AuthState, { title: string; description: string }> = {
  [AUTH_STATE.UNAUTHENTICATED]: {
    title: "サインインが必要です",
    description: "この内容を表示するには、サインインしてください。",
  },
  [AUTH_STATE.SESSION_EXPIRED]: {
    title: "サインインの有効期限が切れました",
    description:
      "操作を続けるには、もう一度サインインしてください。入力中の内容は保存されていません。",
  },
  [AUTH_STATE.FORBIDDEN]: {
    title: "この内容を表示する権限がありません",
    description: "必要な権限が付与されていません。権限の付与は管理者へ依頼してください。",
  },
  [AUTH_STATE.NOT_FOUND]: {
    title: "ページが見つかりません",
    description: "URL が変わったか、削除された可能性があります。",
  },
};

/** 権限不足だけは注意として示し、他は事実の説明に留める。 */
export const AUTH_STATE_VARIANT: Record<AuthState, "default" | "warning"> = {
  [AUTH_STATE.UNAUTHENTICATED]: "default",
  [AUTH_STATE.SESSION_EXPIRED]: "default",
  [AUTH_STATE.FORBIDDEN]: "warning",
  [AUTH_STATE.NOT_FOUND]: "default",
};

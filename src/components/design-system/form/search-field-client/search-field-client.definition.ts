/**
 * 検索語をいつ確定と見なすか。
 *
 * @see Storybook `Form/SearchFieldClient`
 */
export const SEARCH_FIELD_COMMIT: Readonly<{
  TYPING: "typing";
  SUBMIT: "submit";
}> = {
  /** 打鍵が止まったら確定する。結果がその場に見えていて、絞り込みが検索語だけで完結する画面向け。 */
  TYPING: "typing",
  /** 送信の操作でだけ確定する。ほかの条件と一緒にまとめて確定する画面向け。 */
  SUBMIT: "submit",
};

/** {@link SEARCH_FIELD_COMMIT} のいずれか。 */
export type SearchFieldCommit = (typeof SEARCH_FIELD_COMMIT)[keyof typeof SEARCH_FIELD_COMMIT];

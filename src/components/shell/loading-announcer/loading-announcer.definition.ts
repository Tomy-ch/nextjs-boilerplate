/** 支援技術へ渡す、読み込みの始まりと終わりの文言。 */
export const LOADING_ANNOUNCEMENT: Readonly<{
  LOADING: "読み込んでいます";
  LOADED: "読み込みました";
}> = {
  LOADING: "読み込んでいます",
  LOADED: "読み込みました",
};

/**
 * 読み込みが始まってから、読み込み中だと告げるまでの待ち時間（ミリ秒）。
 *
 * @remarks
 * 応答時間の 3 つの限界（Nielsen, *Usability Engineering*, 1993）で、思考の流れが途切れ始めて
 * 進んでいる手がかりが要るのが約 1 秒です。それより早く終わる読み込みは告げず、中身の後に
 * 「読み込んでいます」が読まれることを避けます。
 */
export const ANNOUNCE_LOADING_AFTER_MS = 1000;

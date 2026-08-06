/** 再試行の予算。使い切ると、再試行してよい失敗であっても再試行しない。 */
export type RetryBudget = {
  /** 試行の結果を記録する。 */
  record(succeeded: boolean): void;
  /** いま再試行してよいか。 */
  canRetry(): boolean;
};

const DEFAULT_MAX_TOKENS = 10;

/**
 * 通常リクエスト量に対する比率で再試行を制限する予算を作る。
 *
 * @remarks
 * 接続先が広く劣化しているとき、再試行は事態を悪化させます。個々の呼び出しから見れば
 * 「もう一度試す」は常に合理的ですが、全体で見ると倒れかけた接続先へ倍の負荷を掛けるため、
 * 個々の判断とは別に総量を縛る必要があります。
 *
 * 成功のたびに `ratio` 分のトークンを足し、失敗のたびに 1 消費します。トークンが上限の
 * 半分を下回る間は再試行しません。失敗が続けば予算は急速に尽き、成功が戻れば緩やかに回復します。
 *
 * @param ratio - 成功 1 件あたりに回復するトークン数。通常リクエストに対する再試行の比率
 * @param maxTokens - トークンの上限
 */
export function createRetryBudget(ratio: number, maxTokens = DEFAULT_MAX_TOKENS): RetryBudget {
  let tokens = maxTokens;

  return {
    record(succeeded: boolean): void {
      tokens = succeeded ? Math.min(maxTokens, tokens + ratio) : Math.max(0, tokens - 1);
    },
    canRetry(): boolean {
      return tokens > maxTokens / 2;
    },
  };
}

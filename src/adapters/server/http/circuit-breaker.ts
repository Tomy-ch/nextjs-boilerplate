import type { ResilienceProfile } from "./resilience-profile";

/** 遮断器の状態。 */
type BreakerState = "closed" | "open" | "half-open";

/** 接続先 1 つ分の遮断器。 */
export type CircuitBreaker = {
  /** いま試行してよいか。遮断中なら false。 */
  canAttempt(): boolean;
  /** 試行の結果を記録する。 */
  record(succeeded: boolean): void;
  /** 現在の状態。 */
  state(): BreakerState;
};

/**
 * 失敗率で接続先を遮断する遮断器を作る。
 *
 * @remarks
 * 接続先が 1 つでも遮断器を持ちます。劣化した接続先を叩き続けると、応答を待つ時間の分だけ
 * こちらのリクエストも滞留し、待つだけの処理で自分の資源を消費するためです。遮断中は即座に
 * 失敗を返し、待たせません。
 *
 * 遮断の解除は時間の経過だけでは決めず、試験的に通した試行の結果で決めます（half-open）。
 * 時間だけで戻すと、復旧していない接続先へ再び全量が流れ込みます。
 *
 * @param config - 失敗率・観測数・遮断時間・復帰試行数
 * @param now - 現在時刻のミリ秒を返す関数。呼び出し側が渡す
 */
export function createCircuitBreaker(
  config: ResilienceProfile["breaker"],
  now: () => number,
): CircuitBreaker {
  const window: boolean[] = [];
  let state: BreakerState = "closed";
  let openedAt = 0;
  let probesLeft = 0;

  function open(): void {
    state = "open";
    openedAt = now();
    window.length = 0;
  }

  function close(): void {
    state = "closed";
    window.length = 0;
  }

  return {
    canAttempt(): boolean {
      if (state === "open") {
        if (now() - openedAt < config.openMs) {
          return false;
        }

        state = "half-open";
        probesLeft = config.halfOpenProbes;
      }

      return true;
    },
    record(succeeded: boolean): void {
      if (state === "half-open") {
        if (!succeeded) {
          open();
          return;
        }

        probesLeft -= 1;

        if (probesLeft <= 0) {
          close();
        }

        return;
      }

      window.push(succeeded);

      if (window.length < config.sampleSize) {
        return;
      }

      const failures = window.filter((outcome) => !outcome).length;

      if (failures / window.length >= config.failureRate) {
        open();
        return;
      }

      window.shift();
    },
    state(): BreakerState {
      return state;
    },
  };
}

import { ErrorKind } from "@/errors/error-kind";

import type { ActionState } from "./action-state";
import { newUuid } from "./uuid";

/** 冪等キーを載せるフォーム項目の名前。 */
export const IDEMPOTENCY_KEY_FIELD = "idempotencyKey";

/**
 * 変更 1 回ぶんの冪等キーを作る。
 *
 * @remarks
 * **画面を組み立てるたびに 1 つ作ります。** 同じ画面から何度送っても同じ鍵になるため、二重に
 * 押しても再読み込みで送り直しても、成立する変更は 1 つのままです。逆に、画面を開き直したときは
 * 別の鍵になります。もう一度やる意思で開いた画面が、前回の再生になっては困るためです。
 *
 * **受け取った側は mount のときの値を持ち続けます。** 引き下げての再取得（`router.refresh()`）は
 * 器を unmount せず prop だけを差し替えるため、渡された値をそのまま送ると、書きかけの入力は
 * 残ったまま鍵だけが新しくなります。応答が届かなかった送信をやり直したときに、1 回目と別の鍵で
 * 飛び、再送検知が効きません。
 *
 * 鍵の役割はバックエンドの再送検知だけで、推測されて困る値ではありません。ここで作れるのは、
 * 送信の単位を決めているのが画面だからです。
 *
 * @returns 新しい冪等キー
 */
export function newIdempotencyKey(): string {
  return newUuid();
}

const RETRYABLE_FAILURES: ReadonlySet<ErrorKind> = new Set([
  ErrorKind.UNAVAILABLE,
  ErrorKind.INTERNAL,
  ErrorKind.TOO_MANY_REQUESTS,
  ErrorKind.CANCELED,
]);

/**
 * 送信の結果が、その鍵の役目を終わらせたか。
 *
 * @remarks
 * 成功と、結果が定まった拒否（検証の失敗・衝突・見つからない・権限が無い・未対応など）で true を
 * 返します。次の送信は中身が変わり得るため、新しい鍵で送ります。
 *
 * 結果が定まらない失敗（利用不可・内部エラー・レート制限・中断）と、分類を持たない失敗では false
 * です。前者は同じ鍵で送り直すことこそ鍵の役目で、後者は結果を判断できないため鍵を保ちます。
 *
 * @param state - 直近の送信が返した結果
 * @returns 次の送信を新しい鍵で送るべきなら true
 */
export function settlesSubmission(state: ActionState<unknown>): boolean {
  if (state.status === "success") {
    return true;
  }

  if (state.status === "idle" || state.kind === undefined) {
    return false;
  }

  return !RETRYABLE_FAILURES.has(state.kind);
}

import { ErrorKind } from "@/errors/error-kind";

import type { ActionState } from "./action-state";
import { newUuid } from "./uuid";

/** 冪等キーを載せるフォーム項目の名前。 */
export const IDEMPOTENCY_KEY_FIELD = "idempotencyKey";

/**
 * 変更 1 回ぶんの冪等キーを作る。
 *
 * @remarks
 * **同じ意図の送り直しは同じ鍵で送ります。** 二重に押しても、応答が届かずに送り直しても、成立する
 * 変更は 1 つのままです。1 回きりの送信（登録・確定）は画面を組み立てるたびに 1 つ作り、同じ画面から
 * 繰り返す送信は、成立したあとと、直した入力が別の要求になる拒否のあとに作り直します
 * （`src/features/README.md`）。開き直した画面も次の 1 件も、もう一度やる意思の送信が前回の再生に
 * なっては困るため別の鍵になります。
 *
 * **受け取った側は mount のときの値を持ち続けます。** 画面の取り直し（`router.refresh()`）は
 * 受け取った component を unmount せず prop だけを差し替えるため、渡された値をそのまま送ると、書きかけの入力は
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

/**
 * 失敗の分類ごとに、送信の結果が定まったか。
 *
 * @remarks
 * 結果が定まらない失敗を「定まった」側へ倒すと、同じ送信の送り直しが新しい鍵で飛び、二重に成立し
 * ます。
 *
 * 中断（`canceled`）は自動の再試行の対象にはなりませんが、届いたかどうかが分からない点で結果は
 * 定まっていません。
 */
const SUBMISSION_OUTCOME = {
  [ErrorKind.INVALID_ARGUMENT]: "settled",
  [ErrorKind.UNAUTHENTICATED]: "settled",
  [ErrorKind.PERMISSION_DENIED]: "settled",
  [ErrorKind.NOT_FOUND]: "settled",
  [ErrorKind.CONFLICT]: "settled",
  [ErrorKind.VALIDATION]: "settled",
  [ErrorKind.UNSUPPORTED_MEDIA_TYPE]: "settled",
  [ErrorKind.PAYLOAD_TOO_LARGE]: "settled",
  [ErrorKind.URI_TOO_LONG]: "settled",
  [ErrorKind.TOO_MANY_REQUESTS]: "open",
  [ErrorKind.CANCELED]: "open",
  [ErrorKind.UNAVAILABLE]: "open",
  [ErrorKind.UNIMPLEMENTED]: "settled",
  [ErrorKind.INTERNAL]: "open",
} as const satisfies Record<ErrorKind, "settled" | "open">;

/**
 * 送信の結果が、その鍵の役目を終わらせたか。
 *
 * @remarks
 * 成功と、結果が定まった拒否（`SUBMISSION_OUTCOME` が `settled` とする分類）で true を返します。次の送信は中身が変わり得るため、新しい鍵で送ります。
 *
 * 結果が定まらない失敗（同じく `open` とする分類）と、分類を持たない失敗では false です。前者は同じ鍵で送り直すことこそ鍵の役目で、後者は送る前に止めたものとして扱い、鍵を保ちます。
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

  return SUBMISSION_OUTCOME[state.kind] === "settled";
}

/**
 * 直近の送信が、結果の定まらない失敗だったか。
 *
 * @remarks
 * true のあいだ、次の送信は同じ鍵で同じ中身を送り直すものでなければなりません。受け取る側は同じ
 * 鍵の再送を初回の結果として扱うため、中身を変えると、初回が成立していたときに変える前の中身の
 * 結果が黙って返ります。
 *
 * 分類を持たない失敗は送る前に止めたものとして扱い、false を返します。
 *
 * @param state - 直近の送信が返した結果
 * @returns 直近の送信が結果の定まらない失敗なら true
 */
export function leavesOutcomeOpen(state: ActionState<unknown>): boolean {
  return (
    state.status === "error" &&
    state.kind !== undefined &&
    SUBMISSION_OUTCOME[state.kind] === "open"
  );
}

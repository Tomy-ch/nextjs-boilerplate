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
 * 変更は 1 つのままです。送る画面が mount するたびに 1 つ作り、応答が送信を確定させたら作り直します
 * （{@link settlesSubmission}）。開き直した画面も次の 1 件も、もう一度やる意思の送信が前回の再生に
 * なっては困るため別の鍵になります。
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
 *
 * 競合（`conflict`）は状態の衝突として定まった側に置きます。同じ鍵の要求が処理中であることに充てる
 * エンドポイントは {@link ConflictMeaning} で宣言し、定まらない側へ移します。
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
 * エンドポイントが競合（409）を何に充てているか。
 *
 * @remarks
 * `state-conflict` は対象の状態が送信と食い違ったことで、中身を確かめ直した次の送信は別の要求です。
 * `in-progress` は同じ鍵の要求がまだ処理中であることで、IETF の Idempotency-Key の draft
 * （`draft-ietf-httpapi-idempotency-key-header` §2.7）は直さずに同じ鍵で送り直してよいとします。
 * 新しい鍵で送ると、処理中の 1 回目とは別の操作が始まり得ます。どちらかはステータスコードでは
 * 決まらず、エンドポイントの契約が決めます。
 */
export type ConflictMeaning = "state-conflict" | "in-progress";

/**
 * 失敗の分類が、送信の結果を定めたか。
 *
 * @param kind - 失敗の分類
 * @param conflict - エンドポイントが競合を何に充てているか
 * @returns 結果が定まったなら `settled`、定まらないなら `open`
 */
function outcomeOf(kind: ErrorKind, conflict: ConflictMeaning): "settled" | "open" {
  if (kind === ErrorKind.CONFLICT && conflict === "in-progress") {
    return "open";
  }

  return SUBMISSION_OUTCOME[kind];
}

/**
 * 送信の結果が、その鍵の役目を終わらせたか。
 *
 * @remarks
 * 成功と、結果が定まった拒否（`SUBMISSION_OUTCOME` が `settled` とする分類）で true を返します。次の送信は中身が変わり得るため、新しい鍵で送ります。
 *
 * 結果が定まらない失敗（同じく `open` とする分類）と、分類を持たない失敗では false です。前者は同じ鍵で送り直すことこそ鍵の役目で、後者は送る前に止めたものとして扱い、鍵を保ちます。
 *
 * @param state - 直近の送信が返した結果
 * @param conflict - エンドポイントが競合を何に充てているか。既定は状態の衝突
 * @returns 次の送信を新しい鍵で送るべきなら true
 */
export function settlesSubmission(
  state: ActionState<unknown>,
  conflict: ConflictMeaning = "state-conflict",
): boolean {
  if (state.status === "success") {
    return true;
  }

  if (state.status === "idle" || state.kind === undefined) {
    return false;
  }

  return outcomeOf(state.kind, conflict) === "settled";
}

/**
 * 直近の送信が、結果の定まらない失敗だったか。
 *
 * @remarks
 * true のあいだ、次の送信は同じ鍵で同じ中身を送り直すものでなければなりません。受け取る側は、
 * 同じ鍵で中身の違う再送を拒むか、初回の結果を返します。どちらでも、変えた中身は通りません。
 *
 * 分類を持たない失敗は送る前に止めたものとして扱い、false を返します。
 *
 * @param state - 直近の送信が返した結果
 * @param conflict - エンドポイントが競合を何に充てているか。既定は状態の衝突
 * @returns 直近の送信が結果の定まらない失敗なら true
 */
export function leavesOutcomeOpen(
  state: ActionState<unknown>,
  conflict: ConflictMeaning = "state-conflict",
): boolean {
  return (
    state.status === "error" &&
    state.kind !== undefined &&
    outcomeOf(state.kind, conflict) === "open"
  );
}

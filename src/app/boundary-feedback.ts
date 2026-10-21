import { unstable_isUnrecognizedActionError as isUnrecognizedActionError } from "next/navigation";

import type { ApiError } from "@/components/app-starter/api-error-feedback/api-error-feedback";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 配信が入れ替わったあとに、古い画面が送ったときの文言。
 *
 * @remarks
 * 「失敗した」とは言いません。壊れたのは要求ではなく、画面と配信の版が揃っていないことなので、
 * 利用者がやり直すべきことは送り直しではなく読み込み直しです。
 */
const STALE_MESSAGE =
  "表示していた内容が新しくなりました。読み込み直してから、もう一度お試しください。";

/**
 * 画面と配信の版が揃わなくなった失敗か。
 *
 * @remarks
 * 配信が入れ替わると、開いたままの画面が持つ Server Action の識別子はもう server に在りません。
 * **同じ識別子で送り直しても結果は変わらない**ので、この失敗だけは再試行の導線を出しません。
 * 判別は framework が公開している述語に任せます —— 識別子の持ち方は framework の都合で動き、
 * 応答の綴りを自分で見ると、動いたときに黙って外れます。
 *
 * @param error - 境界が受け取った失敗
 * @returns 版が揃っていないことによる失敗なら `true`
 */
export function isStaleActionError(error: unknown): boolean {
  return isUnrecognizedActionError(error);
}

/**
 * error 境界が受け取った失敗を、表示できる形と再試行の導線へ組む。
 *
 * @remarks
 * 境界ごとに同じ組み立てを書くと、版が揃わない失敗の扱いが 1 か所だけ古くなります。
 *
 * @param error - 境界が受け取った失敗
 * @param reset - framework が渡す、その境界を描き直す口
 * @returns 表示する失敗と、押したときに走らせるもの
 */
export function boundaryFeedback(
  error: Error & { digest?: string },
  reset: () => void,
): { readonly error: ApiError; readonly onRetry: () => void } {
  if (isStaleActionError(error)) {
    return {
      error: { kind: "stale", message: STALE_MESSAGE, requestId: error.digest, retryable: true },
      onRetry: () => {
        window.location.reload();
      },
    };
  }

  return {
    error: {
      kind: "server",
      message: getDefaultErrorMeta(ErrorKind.INTERNAL).message,
      requestId: error.digest,
      retryable: true,
    },
    onRetry: reset,
  };
}

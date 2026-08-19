import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 送り出す URL が予算に収まっているかを確かめる。超えていたら送らずに落とす。
 *
 * @remarks
 * 数えるのは絶対 URL のバイト数です。要求行に載るのは path 以降だけですが、ブラウザと CDN は
 * URL 全体で上限を持つため、どの経路でも安全側になる外側の単位で数えます。
 *
 * 文字数ではなくバイト数で数えます。符号化前の値を渡されても予算を読み違えないためです。
 *
 * @param url - 送り出す絶対 URL
 * @param maxBytes - 経路上で最も小さい URL の上限
 * @throws {@link AppError} 予算を超えているとき、`uri-too-long` として
 */
export function assertUrlWithinBudget(url: string, maxBytes: number): void {
  const bytes = new TextEncoder().encode(url).length;

  if (bytes > maxBytes) {
    throw createAppError(ErrorKind.URI_TOO_LONG, {
      cause: new Error(
        `URL が予算を超えています: ${new URL(url).pathname} が ${bytes} / ${maxBytes} バイト`,
      ),
    });
  }
}

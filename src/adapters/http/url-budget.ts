import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 送り出す要求の path とクエリが予算に収まっているかを確かめる。超えていたら送らずに落とす。
 *
 * @remarks
 * 数えるのは request target——path とクエリ——のバイト数です。これは要求行に載る部分そのもので、
 * 中継が上限を持つ単位と一致します。接続先の異なる経路どうしでも同じものを数えられます。
 *
 * 文字数ではなくバイト数で数えます。符号化前の値を渡されても予算を読み違えないためです。
 *
 * @param target - 送り出す path とクエリ
 * @param maxBytes - 経路上で最も小さい上限
 * @throws {@link AppError} 予算を超えているとき、`uri-too-long` として
 */
export function assertRequestTargetWithinBudget(target: string, maxBytes: number): void {
  const bytes = new TextEncoder().encode(target).length;

  if (bytes > maxBytes) {
    throw createAppError(ErrorKind.URI_TOO_LONG, {
      cause: new Error(
        // クエリは利用者が入れた値を含むため、path だけを出す。
        `要求が予算を超えています: ${target.split("?")[0]} が ${bytes} / ${maxBytes} バイト`,
      ),
    });
  }
}

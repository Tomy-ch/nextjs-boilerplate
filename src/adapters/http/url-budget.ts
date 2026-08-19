import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 送り出す要求の path とクエリが予算に収まっているかを確かめる。超えていたら送らずに落とす。
 *
 * @remarks
 * 数えるのは request target——path とクエリ——のバイト数です。これは要求行に載る部分そのもので、
 * 中継が上限を持つ単位と一致します。接続先の異なる経路どうしでも同じものを数えられます。
 *
 * **渡す値は符号化済みであること。** 実際に送られるのは percent-encode 後の表現で、全角 1 文字は
 * 符号化前の 3 バイトから 9 バイトへ膨らみます。符号化前の値を渡すと予算を 3 分の 1 に見誤ります。
 *
 * @param target - 送り出す path とクエリ。percent-encode 済みであること
 * @param maxBytes - 経路上で最も小さい上限
 * @throws {@link AppError} 予算を超えているとき、`uri-too-long` として
 */
export function assertRequestTargetWithinBudget(target: string, maxBytes: number): void {
  const bytes = new TextEncoder().encode(target).length;

  // 「収まっている」の否定で判定する。上限が数値として届かなければどの比較も成り立たず、
  // 素直に書くと予算の無い要求が全部通る。
  if (!(bytes <= maxBytes)) {
    throw createAppError(ErrorKind.URI_TOO_LONG, {
      cause: new Error(
        // クエリは利用者が入れた値を含むため、path だけを出す。
        `要求が予算を超えています: ${target.split("?")[0]} が ${bytes} / ${maxBytes} バイト`,
      ),
    });
  }
}

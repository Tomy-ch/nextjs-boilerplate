"use client";

import { isStaleActionError } from "@/app/boundary-feedback";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";

/**
 * root layout が壊れたときの最後の境界。
 *
 * @remarks
 * 他の境界と違い `html` と `body` を自分で描画します。この境界が出るのは root layout 自体が
 * 失敗した場合であり、そのとき layout の提供する枠は存在しません。
 *
 * design token も Provider も当てにできないため、装飾は inline style だけで持ちます。
 * `globals.css` の読み込みに失敗している可能性がある経路で class に頼ると、文字が読めない
 * 画面になりえます。
 *
 * **版が揃っていない失敗だけは、描き直しではなく読み込み直しへ誘導します。** 配信が入れ替わった
 * あとの画面は古い識別子を持っており、同じ境界を描き直しても同じ失敗に戻ります。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleActionError(error);

  return (
    <html lang="ja">
      <body style={{ fontFamily: "sans-serif", margin: 0, padding: "2rem" }}>
        <h1 style={{ fontSize: "1.25rem" }}>
          {stale
            ? "表示していた内容が新しくなりました。"
            : getDefaultErrorMeta(ErrorKind.INTERNAL).message}
        </h1>
        {error.digest === undefined ? null : (
          <p style={{ color: "#666", fontSize: "0.875rem" }}>識別子: {error.digest}</p>
        )}
        <button
          onClick={
            stale
              ? () => {
                  window.location.reload();
                }
              : reset
          }
          style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}
          type="button"
        >
          {stale ? "読み込み直す" : "再試行する"}
        </button>
      </body>
    </html>
  );
}

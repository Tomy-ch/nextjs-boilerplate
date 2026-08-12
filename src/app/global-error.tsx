"use client";

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
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: "sans-serif", margin: 0, padding: "2rem" }}>
        <h1 style={{ fontSize: "1.25rem" }}>{getDefaultErrorMeta(ErrorKind.INTERNAL).message}</h1>
        {error.digest === undefined ? null : (
          <p style={{ color: "#666", fontSize: "0.875rem" }}>識別子: {error.digest}</p>
        )}
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }} type="button">
          再試行する
        </button>
      </body>
    </html>
  );
}

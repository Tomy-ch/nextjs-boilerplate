import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";

const tracer = trace.getTracer("render");

/**
 * 描画を span で包んだコンポーネントを返す。
 *
 * @remarks
 * span が覆うのは**そのコンポーネント自身の実行だけ**です。子は戻り値を React が受け取った後に
 * 描画されるため、この span の中には入りません。本体で待つ取得は中に入るので、外向きの通信が
 * どの画面のどの合成から出たのかはここで辿れます。
 *
 * SDK が初期化されていない実行（ブラウザ・Storybook・テスト）では、tracer が何も記録しない
 * span を返すため、包んでも描画は変わりません。
 *
 * @param name - span 名に載せる `src/` からのモジュールパス。利用者の入力を混ぜてはいけません
 *   （span 名の redaction は [0081](../../docs/adr/0081-observability-logging.md)）。
 */
export function withRenderSpan<
  Args extends readonly unknown[],
  Result extends ReactNode | Promise<ReactNode>,
>(name: string, render: (...args: Args) => Result): (...args: Args) => Result {
  return (...args: Args): Result =>
    tracer.startActiveSpan(`render ${name}`, (span): Result => {
      try {
        const result = render(...args);

        if (result instanceof Promise) {
          // 派生した promise ではなく元を返す。React が待つ対象を差し替えない。
          result.then(
            () => span.end(),
            (error: unknown) => endWithFailure(span, error),
          );

          return result;
        }

        span.end();

        return result;
      } catch (error) {
        endWithFailure(span, error);

        throw error;
      }
    });
}

/** 失敗として span を閉じる。ただし Next が制御に使う throw は失敗として記録しない。 */
function endWithFailure(span: Span, error: unknown): void {
  if (!isNavigationSignal(error)) {
    span.setStatus({ code: SpanStatusCode.ERROR });

    if (error instanceof Error) {
      span.recordException(error);
    }
  }

  span.end();
}

/**
 * Next が制御に使う throw（`notFound` / `redirect` など）か。
 *
 * @remarks
 * 判定を digest の中身から読み取らず `unstable_rethrow` に委ねます。対象は framework の内部表現で、
 * 版が変われば形も変わります。
 */
function isNavigationSignal(error: unknown): boolean {
  try {
    unstable_rethrow(error);

    return false;
  } catch {
    return true;
  }
}

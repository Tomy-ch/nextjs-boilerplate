import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";
import { unstable_rethrow } from "next/navigation";
import type { ReactNode } from "react";

const tracer = trace.getTracer("render");

/** 起動境界が注入する、描画を span に載せる範囲です。 */
type RenderSpanConfiguration = Readonly<{
  /** 画面の最上位（`page-content` / `view`）を載せるか。 */
  screens: boolean;
  /** feature が持つ部品（`ui/`）まで載せるか。 */
  parts: boolean;
}>;

/**
 * 注入された範囲を置く場所。
 *
 * @remarks
 * **モジュール変数では届きません。** Next は起動境界と RSC を別のモジュールグラフとして組むため、
 * このファイルは 1 プロセスの中で 2 回インスタンス化されます（`process.pid` は同じで、モジュール
 * ごとの識別子だけが異なることを実測で確認しています）。realm は共有されているので、両方から
 * 見える場所として registered symbol を使います。
 */
const CONFIGURATION_KEY = Symbol.for("nextjs-boilerplate.observability.render-spans");

/**
 * 注入を受けていないときの範囲。
 *
 * @remarks
 * **どちらも無効にします。** 起動境界を通らない実行（テスト・Storybook）で計装を働かせないため
 * です。SDK の有無には頼れません —— trace exporter を切っても、他の signal が有効なら `NodeSDK` は
 * tracer provider を立て、span は記録されたうえで捨てられます。
 */
const DISABLED: RenderSpanConfiguration = { screens: false, parts: false };

/** 描画を span に載せる範囲を起動境界から注入する。 */
export function configureRenderSpans(next: RenderSpanConfiguration): void {
  Reflect.set(globalThis, CONFIGURATION_KEY, next);
}

/** 注入された範囲を読む。別のモジュールインスタンスが書いた値なので、形を確かめてから使う。 */
function readConfiguration(): RenderSpanConfiguration {
  const value: unknown = Reflect.get(globalThis, CONFIGURATION_KEY);

  return isConfiguration(value) ? value : DISABLED;
}

function isConfiguration(value: unknown): value is RenderSpanConfiguration {
  return (
    typeof value === "object" &&
    value !== null &&
    "screens" in value &&
    typeof value.screens === "boolean" &&
    "parts" in value &&
    typeof value.parts === "boolean"
  );
}

/**
 * 画面の最上位の描画を span で包んだコンポーネントを返す。
 *
 * @remarks
 * 対象は `features/<name>/<screen>/` の `page-content` と `view` です。範囲の線引きは
 * [features の README](../features/README.md) が持ちます。
 *
 * @param name - span 名に載せる `src/` からのモジュールパス。利用者の入力を混ぜてはいけません
 *   （span 名の redaction は [0081](../../docs/adr/0081-observability-logging.md)）。
 */
export function withScreenSpan<
  Args extends readonly unknown[],
  Result extends ReactNode | Promise<ReactNode>,
>(name: string, render: (...args: Args) => Result): (...args: Args) => Result {
  return (...args: Args): Result =>
    readConfiguration().screens ? runInSpan(name, render, args) : render(...args);
}

/**
 * feature が持つ部品の描画を span で包んだコンポーネントを返す。
 *
 * @remarks
 * span の数が描く部品の数だけ増えるため、既定では無効です。分岐した結果——どの姿を返したか——を
 * trace から読みたいときに開けます。
 *
 * @param name - {@link withScreenSpan} と同じ。
 */
export function withPartSpan<
  Args extends readonly unknown[],
  Result extends ReactNode | Promise<ReactNode>,
>(name: string, render: (...args: Args) => Result): (...args: Args) => Result {
  return (...args: Args): Result =>
    readConfiguration().parts ? runInSpan(name, render, args) : render(...args);
}

/**
 * 描画を span の中で実行する。
 *
 * @remarks
 * span が覆うのはこの実行だけです。子は戻り値を React が受け取った後に描画されるため中に入らず、
 * 本体で待つ取得だけが中に入ります。
 */
function runInSpan<Args extends readonly unknown[], Result extends ReactNode | Promise<ReactNode>>(
  name: string,
  render: (...args: Args) => Result,
  args: Args,
): Result {
  return tracer.startActiveSpan(`render ${name}`, (span): Result => {
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

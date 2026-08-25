import type { ReactNode } from "react";

/** コンポーネントが返しうるもの。 */
type RenderResult = ReactNode | Promise<ReactNode>;

/**
 * 描画を span で包む実装。
 *
 * @remarks
 * **実装をここへ静的に import しません。** このモジュールは feature が import するため、ブラウザ
 * （Storybook・client component）のバンドルにも入ります。`@opentelemetry/api` を連れて行くと、
 * Vite が取り込む CJS ビルドがブラウザに無い `__dirname` を参照し、モジュール評価の時点で落ちます。
 * 実装は起動境界から注入し、注入の無い実行では計装そのものが動きません。
 */
export type RenderSpanRunner = <Result extends RenderResult>(
  name: string,
  render: () => Result,
) => Result;

/** 起動境界が注入する、描画を span に載せる範囲と実装です。 */
type RenderSpanConfiguration = Readonly<{
  /** 画面の最上位（`page-content` / `view`）を載せるか。 */
  screens: boolean;
  /** feature が持つ部品（`ui/`）まで載せるか。 */
  parts: boolean;
  /** 描画を span で包む実装。 */
  run: RenderSpanRunner;
}>;

/**
 * 注入された構成を置く場所。
 *
 * @remarks
 * **モジュール変数では届きません。** Next は起動境界と RSC を別のモジュールグラフとして組むため、
 * このファイルは 1 プロセスの中で 2 回インスタンス化されます（`process.pid` は同じで、モジュール
 * ごとの識別子だけが異なることを実測で確認しています）。realm は共有されているので、両方から
 * 見える場所として registered symbol を使います。
 */
const CONFIGURATION_KEY = Symbol.for("nextjs-boilerplate.observability.render-spans");

/** 描画を span に載せる範囲と実装を、起動境界から注入する。 */
export function configureRenderSpans(next: RenderSpanConfiguration): void {
  Reflect.set(globalThis, CONFIGURATION_KEY, next);
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
export function withScreenSpan<Args extends readonly unknown[], Result extends RenderResult>(
  name: string,
  render: (...args: Args) => Result,
): (...args: Args) => Result {
  return (...args: Args): Result => {
    const configuration = findConfiguration();

    return configuration?.screens === true
      ? configuration.run(name, () => render(...args))
      : render(...args);
  };
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
export function withPartSpan<Args extends readonly unknown[], Result extends RenderResult>(
  name: string,
  render: (...args: Args) => Result,
): (...args: Args) => Result {
  return (...args: Args): Result => {
    const configuration = findConfiguration();

    return configuration?.parts === true
      ? configuration.run(name, () => render(...args))
      : render(...args);
  };
}

/** 注入された構成を読む。別のモジュールインスタンスが書いた値なので、形を確かめてから使う。 */
function findConfiguration(): RenderSpanConfiguration | undefined {
  const value: unknown = Reflect.get(globalThis, CONFIGURATION_KEY);

  return isConfiguration(value) ? value : undefined;
}

function isConfiguration(value: unknown): value is RenderSpanConfiguration {
  return (
    typeof value === "object" &&
    value !== null &&
    "screens" in value &&
    typeof value.screens === "boolean" &&
    "parts" in value &&
    typeof value.parts === "boolean" &&
    "run" in value &&
    typeof value.run === "function"
  );
}

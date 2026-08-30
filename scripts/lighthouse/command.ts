import type { Target } from "./plan";

/**
 * Lighthouse を起動する指定を組み立てる。
 *
 * @remarks
 * 入口（[`index.ts`](index.ts)）から切り出してあります。起動そのものは遣り取りですが、何を渡すか
 * は入力だけで決まるためです。
 *
 * **ここが壊れても赤くなりません。** 応答の成否を見ない指定を落とせば 404 を返す画面が黙って
 * 計測から消え、ヘッダの条件を反転させれば役割の要る画面へ匿名で当たってログイン画面を測ります。
 * どちらも「測れた数値」が返るので、判定は通ります。
 */

/** 応答が 2xx でない画面も測るための指定。 */
const IGNORE_STATUS_CODE = "--ignore-status-code";

/**
 * 開く前に置いた cookie を消させないための指定。
 *
 * @remarks
 * Lighthouse は既定で保存物を消してから開きます。**同意を選び終えた状態から測るには、開く前に
 * 置いた cookie が残っていなければなりません**（`browser.ts`）。profile は実行ごとの使い捨てなので、
 * 消さないことで前の実行が残るわけではありません。
 */
const KEEP_STORAGE = "--disable-storage-reset";

/**
 * ブラウザへ渡す起動時の指定を決める。
 *
 * @param env - 実行時の環境変数。**読むものだけを型に書きます** —— 環境変数の全体を受け取る形に
 * すると、何を見て分岐しているのかが呼び出し側から読めません。
 *
 * @remarks
 * `--no-sandbox` を足すのは CI だけです。sandbox は多層防御の 1 枚で、外す理由があるのはそれが
 * 成立しない環境 —— runner が sandbox に要る user namespace を持たない —— に限られます。
 */
export function buildChromeFlags(env: { readonly CI?: string }): string[] {
  return ["--headless=new", ...(env.CI === undefined ? [] : ["--no-sandbox"])];
}

/**
 * Lighthouse の CLI へ渡す引数を組み立てる。
 *
 * @param cli - CLI の入口。
 * @param target - 開く画面。
 * @param output - 結果（LHR）の書き出し先。
 * @param port - 立ち上げ済みのブラウザが CDP を受け付けているポート。
 *
 * @remarks
 * 応答の成否を見ない指定は**常に**付けます。宣言には 404 を返す画面が含まれ
 * （[`../../e2e/lib/screens.ts`](../../e2e/lib/screens.ts) の not-found）、既定では Lighthouse が
 * それを「読み込めなかった」として結果を落とすためです。ここが見ているのは応答の成否ではなく
 * 描画の速さで、404 の画面も利用者が実際に見る画面です。
 */
export function buildLighthouseArgs(
  cli: string,
  target: Target,
  output: string,
  port: number,
): string[] {
  return [
    cli,
    target.url,
    "--quiet",
    "--output=json",
    `--output-path=${output}`,
    "--only-categories=performance",
    IGNORE_STATUS_CODE,
    `--port=${String(port)}`,
    KEEP_STORAGE,
  ];
}

import "server-only";

import { getEnvironment } from "../environment";
import type { ClockEnvironment } from "./clock.schema";

class ClockConfig {
  readonly #fixedNow: string | undefined;

  private constructor(fixedNow: string | undefined) {
    this.#fixedNow = fixedNow;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: ClockEnvironment): ClockConfig {
    return new ClockConfig(values.CLOCK_FIXED_NOW);
  }

  /**
   * 画面が「いま」として読む瞬間。
   *
   * @remarks
   * 固定されているときも、呼ぶたびに新しい `Date` を返します。同じ実体を配ると、受け取った側が
   * 破壊的に動かした結果が次の呼び出し元へ伝わります。
   */
  now(): Date {
    return this.#fixedNow === undefined ? new Date() : new Date(this.#fixedNow);
  }
}

let clockConfig: ClockConfig | undefined;

/**
 * 「いま」を供給する、プロセス内で不変な singleton を返す。
 *
 * @remarks
 * **実時計を読む場所を 1 つに寄せるための口です。** 暦日で区切る画面は、区切りを要求のクエリへ
 * 載せます。クエリが実時計から導かれると、契約から応答を組み立てるモックの seed も一緒に動くため
 * （`mocks/stable-responses.ts`）、その画面の基準画像は**撮った暦日のあいだしか一致しません**。
 * 日付が変わった時点で中身が総入れ替えになり、撮り直しても翌日また落ちます。
 *
 * 表示だけを撮影から外す `mask` では届きません。外れるのは日付を描く場所であって、seed から
 * 生まれる値そのものは画面じゅうに散っています。
 */
export function getClockConfig(): ClockConfig {
  clockConfig ??= ClockConfig.fromValues(getEnvironment());
  return clockConfig;
}

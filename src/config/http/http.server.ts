import "server-only";

import { getEnvironment } from "../environment";
import type { HttpEnvironment } from "./http.schema";

class HttpConfig {
  readonly #maxUrlBytes: number;

  private constructor(maxUrlBytes: number) {
    this.#maxUrlBytes = maxUrlBytes;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: HttpEnvironment): HttpConfig {
    return new HttpConfig(values.NEXT_PUBLIC_HTTP_MAX_URL_BYTES);
  }

  /**
   * 1 つの要求 URL に許すバイト数の上限。
   *
   * @remarks
   * 経路のどこが最初に URL を弾くか（ブラウザ / CDN / リバースプロキシ / backend）は配信構成で
   * 変わるため、その最小値を環境変数から受け取ります。
   */
  get maxUrlBytes(): number {
    return this.#maxUrlBytes;
  }
}

let httpConfig: HttpConfig | undefined;

/** http adapter が利用する、プロセス内で不変な singleton を返す。 */
export function getHttpConfig(): HttpConfig {
  httpConfig ??= HttpConfig.fromValues(getEnvironment());
  return httpConfig;
}

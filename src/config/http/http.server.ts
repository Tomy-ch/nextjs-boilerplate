import "server-only";

import { getEnvironment } from "../environment";
import type { HttpEnvironment } from "./http.schema";

class HttpConfig {
  readonly #maxUrlBytes: number;
  readonly #maxUploadBytes: number;

  private constructor(maxUrlBytes: number, maxUploadBytes: number) {
    this.#maxUrlBytes = maxUrlBytes;
    this.#maxUploadBytes = maxUploadBytes;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: HttpEnvironment): HttpConfig {
    return new HttpConfig(
      values.NEXT_PUBLIC_HTTP_MAX_URL_BYTES,
      values.NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES,
    );
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

  /**
   * 中継する 1 件のアップロードに許すバイト数の上限。
   *
   * @remarks
   * 中継の経路では配備先が先に要求を打ち切るため、その上限より内側に取ります。外側に置いた値は
   * 表明されるだけで効きません（[0075](../../../docs/adr/0075-file-upload-seam.md)）。
   */
  get maxUploadBytes(): number {
    return this.#maxUploadBytes;
  }
}

let httpConfig: HttpConfig | undefined;

/** http adapter が利用する、プロセス内で不変な singleton を返す。 */
export function getHttpConfig(): HttpConfig {
  httpConfig ??= HttpConfig.fromValues(getEnvironment());
  return httpConfig;
}

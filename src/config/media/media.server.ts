import "server-only";

import { getEnvironment } from "../environment";
import type { MediaEnvironment } from "./media.schema";

class MediaConfig {
  readonly #origin: string;

  private constructor(origin: string) {
    this.#origin = origin;
  }

  /**
   * 検証済み ENV から production singleton を組み立てる。
   *
   * @param values - 検証済みの media 用 ENV
   * @returns 組み立てた {@link MediaConfig}
   */
  static fromValues(values: MediaEnvironment): MediaConfig {
    return new MediaConfig(values.MEDIA_ORIGIN);
  }

  /**
   * backend のオブジェクトキーから配信 URL を組み立てる origin。
   *
   * @returns media 配信 origin
   */
  get origin(): string {
    return this.#origin;
  }
}

let mediaConfig: MediaConfig | undefined;

/**
 * media adapter が利用する、プロセス内で不変な singleton を返す。
 *
 * @returns {@link MediaConfig} の singleton
 */
export function getMediaConfig(): MediaConfig {
  mediaConfig ??= MediaConfig.fromValues(getEnvironment());
  return mediaConfig;
}

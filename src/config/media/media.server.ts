import "server-only";

import { getEnvironment } from "../environment";
import type { MediaEnvironment } from "./media.schema";

class MediaConfig {
  readonly #origin: string;

  private constructor(origin: string) {
    this.#origin = origin;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: MediaEnvironment): MediaConfig {
    return new MediaConfig(values.MEDIA_ORIGIN);
  }

  /** backend のオブジェクトキーから配信 URL を組み立てる origin。 */
  get origin(): string {
    return this.#origin;
  }
}

let mediaConfig: MediaConfig | undefined;

/** media adapter が利用する、プロセス内で不変な singleton を返す。 */
export function getMediaConfig(): MediaConfig {
  mediaConfig ??= MediaConfig.fromValues(getEnvironment());
  return mediaConfig;
}

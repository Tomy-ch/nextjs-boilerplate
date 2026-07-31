import "server-only";

import { getEnvironment } from "../environment";
import type { ApiEnvironment } from "./api.schema";

class ApiConfig {
  readonly #baseUrl: string;
  readonly #mode: "live" | "mock";

  private constructor(baseUrl: string, mode: "live" | "mock") {
    this.#baseUrl = baseUrl;
    this.#mode = mode;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: ApiEnvironment): ApiConfig {
    return new ApiConfig(values.APP_API_BASE_URL, values.APP_API_MODE);
  }

  /** BFF が接続する API の base URL。 */
  get baseUrl(): string {
    return this.#baseUrl;
  }

  /** API 接続モード。 */
  get mode(): "live" | "mock" {
    return this.#mode;
  }
}

let apiConfig: ApiConfig | undefined;

/** API adapter が利用する、プロセス内で不変な singleton を返す。 */
export function getApiConfig(): ApiConfig {
  apiConfig ??= ApiConfig.fromValues(getEnvironment());
  return apiConfig;
}

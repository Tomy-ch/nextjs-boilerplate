import "server-only";

import { getEnvironment } from "../environment";
import type { ObservabilityEnvironment } from "./observability.schema";

class ObservabilityConfig {
  readonly #otlpEndpoint: string;

  private constructor(otlpEndpoint: string) {
    this.#otlpEndpoint = otlpEndpoint;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: ObservabilityEnvironment): ObservabilityConfig {
    return new ObservabilityConfig(values.OTEL_EXPORTER_OTLP_ENDPOINT);
  }

  /** OpenTelemetry exporter の送信先。 */
  get otlpEndpoint(): string {
    return this.#otlpEndpoint;
  }
}

let observabilityConfig: ObservabilityConfig | undefined;

/** observability adapter が利用する、プロセス内で不変な singleton を返す。 */
export function getObservabilityConfig(): ObservabilityConfig {
  observabilityConfig ??= ObservabilityConfig.fromValues(getEnvironment());
  return observabilityConfig;
}

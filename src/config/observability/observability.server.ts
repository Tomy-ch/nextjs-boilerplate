import "server-only";

import { getEnvironment } from "../environment";
import { type ObservabilityEnvironment, OtelExporter } from "./observability.schema";

class ObservabilityConfig {
  readonly #serviceName: string;
  readonly #otlpEndpoint: string;
  readonly #tracesExporter: string;
  readonly #metricsExporter: string;
  readonly #logsExporter: string;

  private constructor(
    serviceName: string,
    otlpEndpoint: string,
    tracesExporter: string,
    metricsExporter: string,
    logsExporter: string,
  ) {
    this.#serviceName = serviceName;
    this.#otlpEndpoint = otlpEndpoint;
    this.#tracesExporter = tracesExporter;
    this.#metricsExporter = metricsExporter;
    this.#logsExporter = logsExporter;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: ObservabilityEnvironment): ObservabilityConfig {
    return new ObservabilityConfig(
      values.OBS_SERVICE_NAME,
      values.OTEL_EXPORTER_OTLP_ENDPOINT,
      values.OBS_TRACES_EXPORTER,
      values.OBS_METRICS_EXPORTER,
      values.OBS_LOGS_EXPORTER,
    );
  }

  /** テレメトリの発信元を表す service 名。 */
  get serviceName(): string {
    return this.#serviceName;
  }

  /** OpenTelemetry exporter の送信先。 */
  get otlpEndpoint(): string {
    return this.#otlpEndpoint;
  }

  /** trace exporter を構築するかを返す。 */
  get tracesEnabled(): boolean {
    return isActiveExporter(this.#tracesExporter);
  }

  /** metrics exporter を構築するかを返す。 */
  get metricsEnabled(): boolean {
    return isActiveExporter(this.#metricsExporter);
  }

  /** logs exporter を構築するかを返す。 */
  get logsEnabled(): boolean {
    return isActiveExporter(this.#logsExporter);
  }
}

function isActiveExporter(value: string): boolean {
  return value.length > 0 && value !== OtelExporter.NONE;
}

let observabilityConfig: ObservabilityConfig | undefined;

/** observability adapter が利用する、プロセス内で不変な singleton を返す。 */
export function getObservabilityConfig(): ObservabilityConfig {
  observabilityConfig ??= ObservabilityConfig.fromValues(getEnvironment());
  return observabilityConfig;
}

import { z } from "zod";

import { apiBaseUrlValidator, apiModeValidator } from "./api/api.schema";
import {
  authClientIdValidator,
  authIssuerValidator,
  authRedirectUriValidator,
  authScopesValidator,
  authSessionSecretValidator,
} from "./auth/auth.schema";
import { maxUploadBytesValidator, maxUrlBytesValidator } from "./http/http.schema";
import { findApplicationEnvironment } from "./load-environment";
import { mediaOriginValidator } from "./media/media.schema";
import { otlpEndpointValidator, otlpExporterValidator } from "./observability/observability.schema";

/**
 * 同梱の秘密値を許す環境。
 *
 * @remarks
 * 開発と CI の ENV ファイルが積む同梱値を通すための例外です。`APP_ENV` の未指定は許しません
 * —— 未指定は `null` で返り、`local` にも `ci` にも一致しないためです。
 */
function allowsShippedSecrets(): boolean {
  const environment = findApplicationEnvironment();

  return environment === "local" || environment === "ci";
}

const environmentSchema = z.object({
  APP_API_BASE_URL: apiBaseUrlValidator(),
  APP_API_MODE: apiModeValidator(),
  MEDIA_ORIGIN: mediaOriginValidator(),
  OTEL_EXPORTER_OTLP_ENDPOINT: otlpEndpointValidator(),
  OBS_TRACES_EXPORTER: otlpExporterValidator(),
  OBS_METRICS_EXPORTER: otlpExporterValidator(),
  OBS_LOGS_EXPORTER: otlpExporterValidator(),
  AUTH_ISSUER: authIssuerValidator(),
  AUTH_CLIENT_ID: authClientIdValidator(),
  AUTH_REDIRECT_URI: authRedirectUriValidator(),
  AUTH_SCOPES: authScopesValidator(),
  AUTH_SESSION_SECRET: authSessionSecretValidator(allowsShippedSecrets()),
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: maxUrlBytesValidator(),
  NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES: maxUploadBytesValidator(),
});

export type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

/**
 * 指定された環境変数セットを検証し、型付きの値へ変換する。
 *
 * この関数は config カーネル内部だけで用いる。本番の singleton は
 * {@link getEnvironment} を通じて同じ評価結果を共有する。
 */
function parseEnvironment(environment: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.safeParse(environment);

  if (result.success) {
    return result.data;
  }

  const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`環境変数が不足しているか不正です: ${fields}`);
}

/**
 * プロセス内で一度だけ全 ENV を検証した結果を返す。
 *
 * `loadEnvironment()` が `env/.env.<APP_ENV>` を `process.env` へ読み込んだ後に初めて
 * 呼ぶことを前提とする。ESM の module cache とこのキャッシュにより、目的別 Config は
 * 同一の不変な評価結果を共有する。
 */
export function getEnvironment(): Environment {
  cachedEnvironment ??= parseEnvironment(process.env);
  return cachedEnvironment;
}

/**
 * build 境界で ENV の全量検証だけを実行する。
 *
 * 値の利用は行わず、必須値の欠落・形式不正を Next.js の build failure として返す。
 */
export function validateEnvironment(): void {
  getEnvironment();
}

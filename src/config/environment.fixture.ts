import { vi } from "vitest";

import type { Environment } from "./environment";

/**
 * 検証を通る環境変数一式。
 *
 * @remarks
 * schema は全 purpose の変数をまとめて検証するため、purpose を 1 つだけ確かめたい場合でも
 * 一式を揃える必要があります。各テストが自分の分だけを stub すると、他の purpose の欠落で
 * 落ちて検査したい判定へ到達しません。
 */
const VALID_ENVIRONMENT = {
  APP_API_BASE_URL: "https://api.example.test",
  APP_API_MODE: "mock",
  MEDIA_ORIGIN: "https://media.example.test",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test/v1/traces",
  OBS_TRACES_EXPORTER: "otlp",
  OBS_METRICS_EXPORTER: "none",
  OBS_LOGS_EXPORTER: "",
  AUTH_ISSUER: "https://id.example.test",
  AUTH_CLIENT_ID: "nextjs-boilerplate",
  AUTH_REDIRECT_URI: "https://app.example.test/auth/callback",
  AUTH_SCOPES: "openid profile",
  AUTH_SESSION_SECRET: "01234567890123456789012345678901",
  NEXT_PUBLIC_HTTP_MAX_URL_BYTES: "8000",
  NEXT_PUBLIC_HTTP_MAX_UPLOAD_BYTES: "4194304",
} satisfies Record<keyof Environment, string>;

/** 検証を通る環境変数一式を stub する。 */
export function stubValidEnvironment(): void {
  for (const [name, value] of Object.entries(VALID_ENVIRONMENT)) {
    vi.stubEnv(name, value);
  }
}

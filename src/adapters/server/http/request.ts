import "server-only";

import type { ZodType } from "zod";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { type CircuitBreaker, createCircuitBreaker } from "./circuit-breaker";
import { DEFAULT_PROFILE, type ResilienceProfile } from "./resilience-profile";
import { createRetryBudget, type RetryBudget } from "./retry-budget";
import {
  backoffDelayMs,
  isRetryableMethod,
  isRetryableOutcome,
  retryAfterDelayMs,
  toErrorKind,
} from "./retry-policy";

/**
 * 本文の符号化。JSON と form のどちらか一方だけを指定できる。
 *
 * @remarks
 * 型で排他にしているのは、両方を渡した実装が「どちらが送られるか」を読む側に推測させるためです。
 * 送る形は 1 つに決まっていなければなりません。
 */
type RequestPayload =
  | {
      /** 送信する本文。JSON として送る。 */
      body?: unknown;
      form?: never;
    }
  | {
      body?: never;
      /**
       * 送信する本文。form として符号化して送る。
       *
       * @remarks
       * OAuth / OIDC の token endpoint は `application/x-www-form-urlencoded` を要求します
       * （RFC 6749 §4.1.3）。JSON を受け付けない相手が実在するため、符号化の選択をこの境界が持ちます。
       */
      form?: Readonly<Record<string, string>>;
    };

/** 呼び出し 1 件の指定。 */
type RequestSpec<T> = RequestPayload & {
  /** base URL からの相対パス。 */
  path: string;
  /** HTTP メソッド。既定は GET。 */
  method?: string;
  /** クエリ文字列。 */
  searchParams?: Record<string, string | undefined>;
  /**
   * 応答の検証スキーマ。
   *
   * 契約に載っている形であることを、内層へ渡す前にここで確かめる。バックエンドの応答には
   * server 側の runtime 検証が無く、契約破れを止める最後の地点がこの境界になる。
   */
  schema: ZodType<T>;
  /**
   * 冪等な呼び出しであることの宣言。
   *
   * POST / PATCH を再試行してよいのは、同じ要求が 2 度届いても結果が変わらないことを
   * 呼び出し側が保証したときだけ（Idempotency-Key の付与など）。
   */
  idempotent?: boolean;
  /** Next.js のキャッシュ指定。指定しなければキャッシュしない。 */
  cache?: RequestCache;
  /** キャッシュの再検証に使うタグ。 */
  tags?: readonly string[];
};

/** 接続先ごとの実行環境。 */
export type HttpClient = {
  request<T>(spec: RequestSpec<T>): Promise<T>;
};

type ClientDeps = {
  baseUrl: string;
  profile?: ResilienceProfile;
  fetchImpl?: typeof fetch;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const JSON_CONTENT_TYPE = "application/json";
const FORM_CONTENT_TYPE = "application/x-www-form-urlencoded";

/** 指定された本文を、送出できる形と Content-Type の組へ変換する。本文が無ければ undefined。 */
function encodePayload(
  spec: RequestPayload,
): { headers: Record<string, string>; body: string } | undefined {
  if (spec.form !== undefined) {
    return {
      headers: { "Content-Type": FORM_CONTENT_TYPE },
      body: new URLSearchParams(spec.form).toString(),
    };
  }

  if (spec.body !== undefined) {
    return { headers: { "Content-Type": JSON_CONTENT_TYPE }, body: JSON.stringify(spec.body) };
  }

  return undefined;
}

function buildUrl(
  baseUrl: string,
  path: string,
  searchParams?: RequestSpec<unknown>["searchParams"],
): string {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * バックエンドへの接続を 1 か所に集約したクライアントを作る。
 *
 * @remarks
 * 生の `fetch` を上位層へ散らさないための境界です。timeout・再試行・遮断・応答の検証・
 * エラーの正規化をここだけが持つことで、呼び出し側は「失敗したときに何が起きるか」を
 * 呼び出しごとに設計せずに済みます。
 *
 * 時刻・乱数・待機・fetch は引数で受け取ります。これらを内部で直接掴むと、再試行や遮断の
 * 振る舞いを実時間を待たずに検証できなくなります。
 */
export function createHttpClient({
  baseUrl,
  profile = DEFAULT_PROFILE,
  // 既定を `fetch` そのものではなく呼び出し時の解決にする。クライアントは接続先ごとに
  // 1 つを長く使い回すため、生成時点の実装を握ると、後から差し込まれた実装（モックなど）に
  // 切り替わらない。
  fetchImpl = (input, init) => fetch(input, init),
  now = Date.now,
  random = Math.random,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: ClientDeps): HttpClient {
  const breaker: CircuitBreaker = createCircuitBreaker(profile.breaker, now);
  const budget: RetryBudget = createRetryBudget(profile.retryBudgetRatio);

  async function attempt(
    url: string,
    spec: RequestSpec<unknown>,
    signal: AbortSignal,
  ): Promise<Response> {
    const timeout = AbortSignal.timeout(profile.perAttemptTimeoutMs);
    const payload = encodePayload(spec);

    return fetchImpl(url, {
      method: spec.method ?? "GET",
      signal: AbortSignal.any([signal, timeout]),
      headers: payload?.headers,
      body: payload?.body,
      cache: spec.cache,
      next: spec.tags === undefined ? undefined : { tags: [...spec.tags] },
    });
  }

  return {
    async request<T>(spec: RequestSpec<T>): Promise<T> {
      if (!breaker.canAttempt()) {
        throw createAppError(ErrorKind.UNAVAILABLE, {
          cause: new Error(`接続先が遮断されています: ${spec.path}`),
        });
      }

      const url = buildUrl(baseUrl, spec.path, spec.searchParams);
      const deadline = now() + profile.overallTimeoutMs;
      const overall = AbortSignal.timeout(profile.overallTimeoutMs);
      const retryable = isRetryableMethod(spec.method ?? "GET", spec.idempotent ?? false);
      let lastError: Error = new Error(`応答がありません: ${spec.path}`);
      let lastKind: ErrorKind = ErrorKind.UNAVAILABLE;

      for (let count = 1; count <= profile.maxAttempts; count += 1) {
        let response: Response | undefined;

        try {
          response = await attempt(url, spec, overall);
        } catch (cause) {
          lastError = cause instanceof Error ? cause : new Error(String(cause));
          lastKind = overall.aborted ? ErrorKind.CANCELED : ErrorKind.UNAVAILABLE;
        }

        if (response?.ok === true) {
          breaker.record(true);
          budget.record(true);

          return parse(spec.schema, await response.json(), spec.path);
        }

        breaker.record(false);
        budget.record(false);

        if (response !== undefined) {
          lastKind = toErrorKind(response.status);
          lastError = new Error(`${spec.method ?? "GET"} ${spec.path} が失敗しました`);
        }

        const canRetry =
          retryable &&
          count < profile.maxAttempts &&
          isRetryableOutcome({ status: response?.status }) &&
          budget.canRetry() &&
          !overall.aborted;

        if (!canRetry) {
          break;
        }

        const delay =
          retryAfterDelayMs(response?.headers.get("Retry-After") ?? null, now()) ??
          backoffDelayMs(count, random);

        // 待った先が全体の期限を越えるなら、待たずに諦める。期限に間に合わない再試行は
        // 接続先へ負荷を足すだけで、呼び出し側には何も返せない。
        if (now() + delay >= deadline) {
          break;
        }

        await sleep(delay);
      }

      throw createAppError(lastKind, { cause: lastError });
    },
  };
}

/**
 * 応答を契約の形へ突き合わせる。
 *
 * @remarks
 * 検証に失敗した応答は契約破れであり、通信の失敗と区別して `internal` として扱います。
 * 送り直しても直らないため再試行の対象にもしません。
 */
function parse<T>(schema: ZodType<T>, payload: unknown, path: string): T {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw createAppError(ErrorKind.INTERNAL, {
      cause: new Error(`応答が契約と一致しません: ${path}`, { cause: result.error }),
    });
  }

  return result.data;
}

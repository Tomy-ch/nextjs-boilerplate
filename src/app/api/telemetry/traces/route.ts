import { toErrorResponse } from "@/adapters/server/http/error-response";
import { readJsonBody } from "@/adapters/server/http/json-request";
import {
  forwardTraceExport,
  MAX_TRACE_EXPORT_BYTES,
  parseTraceExport,
} from "@/adapters/server/telemetry/browser-traces";
import { ErrorKind } from "@/errors/error-kind";

/**
 * ブラウザが作った span を OTLP へ中継する。
 *
 * 隣の口（`../route.ts`）が受けるのはこのリポジトリが決めた形の報告で、ここが受けるのは
 * **OTLP そのもの**です。読み替えずに collector へ渡します（口を分ける理由は
 * [README](../../README.md)「telemetry/traces/」）。
 *
 * ブラウザは collector の endpoint を知りません。送り先はこの口で、資格情報が要る構成でもそれを
 * 載せるのはサーバー側です。
 *
 * 認証を要求しない口なので、本体を読む前に型と大きさで落とします（防御の中身と根拠は
 * [`readJsonBody`](../../../../adapters/server/http/json-request.ts)）。
 *
 * 中継そのものの失敗は応答に載せません（`forwardTraceExport` が呼び出し元へ投げ返しません）。
 */
export async function POST(request: Request): Promise<Response> {
  const read = await readJsonBody(request, MAX_TRACE_EXPORT_BYTES);

  if (!read.ok) {
    return toErrorResponse(read.kind);
  }

  const traces = parseTraceExport(read.value);

  if (traces === undefined) {
    return toErrorResponse(ErrorKind.INVALID_ARGUMENT);
  }

  await forwardTraceExport(traces);

  return new Response(null, { status: 204 });
}

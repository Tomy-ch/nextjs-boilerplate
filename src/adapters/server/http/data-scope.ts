import "server-only";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

/**
 * 取得の口が扱う値の分類。
 *
 * @remarks
 * 分類は値ではなく**口**に持たせます（[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md)
 * 決定 1）。値を包む形にすると、包みを解いた時点で分類が消えます。解くのは PII が正当に出ていく
 * 描画の地点であり、そこは保証が要る場所ではありません。
 *
 * **資格情報を載せうる口は、載せなかった回も含めて `user-scoped` です**（同 決定 3）。分類は口の
 * 性質であって要求ごとの結果ではないため、静的に決まります。
 *
 * 呼び出し側に値を綴りのまま書かせるのは、この宣言を検査が読むためです
 * （`project-rules/no-user-scoped-in-cached-module`）。綴りを定数へ寄せると検査が黙って外れるので、
 * `scripts/scope-spelling.gate.test.ts` が綴りのままであることを見張ります。
 */
export type DataScope = "public" | "user-scoped";

/**
 * 資格情報を運ぶヘッダ。
 *
 * @remarks
 * HTTP が資格情報の運び手として定めているものです（RFC 9110 §11.6.2 / RFC 6265）。アプリ固有の
 * 名前は並べません —— どのヘッダが主体を指すかは接続先の契約が決めることで、この境界が知って
 * よいのは HTTP の語彙までです。契約が独自に持つ識別子のヘッダは、それを載せる口の分類が
 * `user-scoped` になることで覆います。
 */
const CREDENTIAL_HEADERS: readonly string[] = ["authorization", "cookie"];

/**
 * 呼び出しごとの指定が、口の分類に許された範囲に収まっていることを確かめる。
 *
 * @remarks
 * 同じことを型が既に禁じています（`request.ts` の `UserScopedRequestSpec`）。ここに置くのは
 * **型を迂回した書き方**への後詰めで、別の口の使い回しや組み立てた spec から入ってくる経路を
 * 止めます（[0112](../../../../docs/adr/0112-data-classification-cache-boundary.md) 決定 4）。
 *
 * @throws 分類に許されない指定を含むとき
 */
export function assertSpecWithinScope(
  scope: DataScope,
  spec: { path: string; cache?: RequestCache; tags?: readonly string[] },
): void {
  if (scope === "user-scoped" && (spec.cache !== undefined || spec.tags !== undefined)) {
    throw createAppError(ErrorKind.INVALID_ARGUMENT, {
      cause: new Error(`主体に紐づく取得はキャッシュへ入れられません: ${spec.path}`),
    });
  }
}

/**
 * 資格情報のヘッダが呼び出しごとの指定に混ざっていないことを確かめる。
 *
 * @remarks
 * 資格情報を組むのは要求境界だけです（[0079](../../../../docs/adr/0079-auth-frontend-seam.md) §6）。
 * 呼び出しごとに組める余地が残っていると、**口の分類が「その client が資格情報を載せるか」を
 * 言い当てられなくなります** —— 分類の前提そのものが崩れるため、綴りの段階で塞ぎます。
 *
 * @throws 資格情報のヘッダを含むとき
 */
export function assertNoCredentialHeader(headers?: Readonly<Record<string, string>>): void {
  const credential = Object.keys(headers ?? {}).find((name) =>
    CREDENTIAL_HEADERS.includes(name.toLowerCase()),
  );

  if (credential !== undefined) {
    throw createAppError(ErrorKind.INVALID_ARGUMENT, {
      cause: new Error(`資格情報のヘッダは呼び出しごとに組めません: ${credential}`),
    });
  }
}

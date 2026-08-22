import "server-only";

import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";

import { getAuthConfig } from "@/config/auth/auth.server";
import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SESSION_ROLE } from "@/model/session";

import { deriveSealKey, SEAL_HEADER } from "./seal-key";
import { TRANSACTION_MAX_AGE_SECONDS } from "./session-cookie";
import type { TestSessionSpec } from "./test-session-record";

/** 封緘した認可コードの中身。 */
const SealedCode = z.object({
  sub: z.string(),
  role: z.enum([SESSION_ROLE.admin, SESSION_ROLE.user]),
  expiresInSeconds: z.number(),
  accessToken: z.string().optional(),
});

/**
 * 開発用の認可コードを発行する。
 *
 * @remarks
 * IdP が持つ「認可した内容を、交換されるまで預かる」役目を、開発用の面が肩代わりします。**指定を
 * URL に平文で載せません** —— `code` は利用者が編集できる位置に現れるため、そこに役割を書けば
 * 誰でも管理者として戻ってこられます。封緘してあれば、書き換えた時点で交換が失敗します。
 *
 * 使い切りはこのコード自身ではなく、**併せて要る一時状態**が担保します。`/api/auth/callback` は
 * 取り出しと同時に一時状態を捨てるため（`takeTransaction`）、同じコードで 2 度目の交換はできません。
 *
 * 寿命は一時状態と揃えます。一時状態が切れたコードは交換できないので、それより長く生かしても
 * 使える時間は伸びません。
 *
 * 秘密値を引数に取らず設定から読むのは、**呼ぶのが app 層だから**です（`/dev/session` の Server
 * Action）。渡す形にすると、封緘の鍵が `adapters/server/auth` の外を通ります。
 */
export async function issueDevelopmentAuthorizationCode(spec: TestSessionSpec): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new EncryptJWT({
    sub: spec.subject,
    role: spec.role,
    expiresInSeconds: spec.expiresInSeconds,
    ...(spec.accessToken === undefined ? {} : { accessToken: spec.accessToken }),
  })
    .setProtectedHeader(SEAL_HEADER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + TRANSACTION_MAX_AGE_SECONDS)
    .encrypt(await deriveSealKey(getAuthConfig().sessionSecret));
}

/**
 * 開発用の認可コードを、発行の指定へ戻す。
 *
 * @remarks
 * 秘密値を引数で受け取るのは、**呼ぶのが Resolver だから**です。Resolver は依存を注入されて
 * 組み立てられるので、ここで設定を直に読むと、Resolver の検証が環境変数の用意を要求します。
 *
 * @throws 復号できないとき、失効しているとき、中身が宣言した形でないとき
 */
export async function openDevelopmentAuthorizationCode(
  code: string,
  secret: string,
): Promise<TestSessionSpec> {
  try {
    const { payload } = await jwtDecrypt(code, await deriveSealKey(secret));
    const parsed = SealedCode.parse(payload);

    return {
      subject: parsed.sub,
      role: parsed.role,
      expiresInSeconds: parsed.expiresInSeconds,
      ...(parsed.accessToken === undefined ? {} : { accessToken: parsed.accessToken }),
    };
  } catch (cause) {
    // 復号の失敗・失効・形の違いを区別しない。どれも「このコードでは session を作れない」で
    // 同じであり、区別できると、書き換えたコードを試す側への手掛かりになる。
    throw createAppError(ErrorKind.UNAUTHENTICATED, { cause });
  }
}

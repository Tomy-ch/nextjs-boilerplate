import "server-only";

import { z } from "zod";

import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { createHttpClient } from "../http/request";

/** OIDC Discovery の取得先。仕様が定める固定パス（OpenID Connect Discovery 1.0 §4）。 */
const DISCOVERY_PATH = "/.well-known/openid-configuration";

/**
 * Discovery 文書のうち、この境界が使う項目。
 *
 * @remarks
 * 使わない項目は宣言しません。契約の検証は「使う形になっているか」を見るためのもので、
 * 相手が返す全項目を書き写すと、使っていない項目の変更で落ちるようになります。
 */
const DiscoveryDocument = z.object({
  issuer: z.string(),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  jwks_uri: z.url(),
  end_session_endpoint: z.url().optional(),
});

/** IdP が公開している接続先。 */
export type OidcEndpoints = {
  /** 認可要求を送り出す先。 */
  readonly authorizationEndpoint: string;
  /** 認可コードを交換する先。 */
  readonly tokenEndpoint: string;
  /** 署名鍵の取得先。 */
  readonly jwksUri: string;
  /** IdP 側の session を終わらせる先。持たない IdP もある。 */
  readonly endSessionEndpoint: string | null;
};

/**
 * IdP の Discovery 文書から接続先を取得する。
 *
 * @remarks
 * 接続先を設定に列挙せず Discovery から引くのは、IdP を替えたときに変える値を `issuer` 1 つに
 * 保つためです。エンドポイントを個別に設定へ置くと、IdP ごとに設定項目が増え、しかも実物との
 * 食い違いが起動時には分かりません。
 *
 * **応答の `issuer` が設定値と一致することを確かめます。** ここを見ないと、乗っ取った Discovery
 * 文書で認可要求の宛先だけを差し替えられます（OpenID Connect Discovery 1.0 §4.3 の検証要件）。
 *
 * 結果は呼び出し側が保持します。ここで process 単位に握ると、鍵や口の入れ替えを反映する手段が
 * 無くなり、テストも取得を差し替えられません。
 *
 * @param issuer - 設定が持つ issuer
 * @param maxUrlBytes - 1 つの要求 URL に許すバイト数の上限
 * @param fetchImpl - 取得に使う実装。既定は環境の `fetch`
 * @throws Discovery を取得できないとき、`issuer` が一致しないとき
 */
export async function fetchOidcEndpoints(
  issuer: string,
  maxUrlBytes: number,
  fetchImpl?: typeof fetch,
): Promise<OidcEndpoints> {
  const client = createHttpClient({ scope: "public", baseUrl: issuer, maxUrlBytes, fetchImpl });
  const document = await client.request({ path: DISCOVERY_PATH, schema: DiscoveryDocument });

  if (document.issuer !== issuer) {
    throw createAppError(ErrorKind.INTERNAL, {
      cause: new Error(`Discovery の issuer が設定と一致しません: ${document.issuer}`),
    });
  }

  return {
    authorizationEndpoint: document.authorization_endpoint,
    tokenEndpoint: document.token_endpoint,
    jwksUri: document.jwks_uri,
    endSessionEndpoint: document.end_session_endpoint ?? null,
  };
}

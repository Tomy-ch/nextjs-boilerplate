import "server-only";

import { z } from "zod";

import { getAuthConfig } from "@/config/auth/auth.server";
import { getHttpConfig } from "@/config/http/http.server";

import { createHttpClient } from "../http/request";
import { fetchOidcEndpoints } from "./oidc-discovery";

const TokenResponse = z.object({ access_token: z.string().min(1) });

/**
 * 主体を名指しするために送るパラメータの名前。
 *
 * @remarks
 * 開発用の IdP は、受け取った利用者名をそのまま `sub` に据えたトークンを返します（実測）。
 * 照合する相手が居ないので、対になる `password` の中身は使われません。
 */
const SUBJECT_PARAM = "username";

/**
 * 利用者名と対で送る値。
 *
 * @remarks
 * 開発用の IdP は照合せず、**送られてくること**だけを求めます。実在の資格情報ではないので、
 * 秘密として扱う値でもありません。
 */
const UNUSED_PASSWORD = "unused";

/**
 * 開発用の IdP から、指定した主体のアクセストークンを取る。
 *
 * @remarks
 * **この関数は、このリポジトリが繋ぐ開発用 IdP の作法に合わせてあります。** 同じ作者の
 * `go-boilerplate` が compose で立てる mock OIDC サーバが相手で、Resource Owner Password
 * Credentials で利用者名を渡すと、その主体のトークンを返します。**本物の IdP でこの付与方式を
 * 使ってはいけません**（OAuth 2.1 で廃止済み）。ここで通るのは、照合する相手が居ない開発用の
 * 実装だからです。
 *
 * したがって、**別の mock 認証を使うなら書き換えるのはこのファイルです。** 呼び出し側
 * （`/dev/session`）が知っているのは「主体を渡すとトークンが返る」ことだけで、取り方は
 * 知りません。
 *
 * **繋ぎ先は呼び出し側から受け取ります。** 設定の `AUTH_ISSUER` を読みません —— バックエンドを
 * 複数の口で並行して立てる開発機では、いま叩いている API が期待する issuer と、フロントの設定が
 * 指す issuer がずれます。ずれたまま取ると、トークンは出るのに API で 401 になり、原因が
 * 「トークンの取り方」ではなく「取った先」であることが応答から読めません。**通るべき相手を
 * 知っているのは、その場で繋ぎ先を選んでいる人です。**
 *
 * 口の場所は Discovery から引きます。`token_endpoint` まで受け取る形にすると、渡す側が IdP の
 * 内部構造を知ることになります。**受け取った issuer と Discovery が名乗る issuer の一致も、
 * そこで確かめられます**（`fetchOidcEndpoints`）—— 打ち間違えた宛先は、トークンが出る前に落ちます。
 *
 * **本番で呼ばれてはならない口です。** 開ける環境の判定は呼び出し側が持ちます
 * （`isDevelopmentAccessAllowed()`）。ここが持つのは取り方だけで、開けてよいかは判定しません
 * —— 判定を二重に持つと、条件が食い違ったときにどちらが正か決められなくなります。宛先を
 * 受け取る口である以上、**開いたままにすると任意の宛先へ要求を出せる**ので、閉じる側の判定が
 * 効いていることがこの口の前提です。
 *
 * @param input.subject - 誰として振る舞うか。session の利用者 ID と同じ値を渡す
 * @param input.issuer - トークンを取りに行く IdP。いま繋いでいる API が期待するもの
 * @returns 実 API へ Bearer として載せられるアクセストークン
 * @throws Discovery か token endpoint が応答しないとき、応答がトークンを含まないとき
 */
export async function issueDevelopmentAccessToken(input: {
  readonly subject: string;
  readonly issuer: string;
}): Promise<string> {
  const { subject, issuer } = input;
  const { clientId } = getAuthConfig();
  const { maxUrlBytes } = getHttpConfig();
  const { tokenEndpoint } = await fetchOidcEndpoints(issuer, maxUrlBytes);
  const client = createHttpClient({ baseUrl: issuer, maxUrlBytes });

  const { access_token } = await client.request({
    path: tokenEndpoint,
    method: "POST",
    form: {
      grant_type: "password",
      client_id: clientId,
      password: UNUSED_PASSWORD,
      [SUBJECT_PARAM]: subject,
    },
    schema: TokenResponse,
  });

  return access_token;
}

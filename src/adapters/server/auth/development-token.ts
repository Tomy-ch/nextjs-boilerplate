import "server-only";

import { z } from "zod";

import { getAuthConfig } from "@/config/auth/auth.server";
import { getHttpConfig } from "@/config/http/http.server";
import { createErrorMeta, withErrorMeta } from "@/errors/error-meta";

import { createHttpClient } from "../http/request";
import { fetchOidcEndpoints } from "./oidc-discovery";

const TokenResponse = z.object({ access_token: z.string().min(1) });

/**
 * 主体を名指しするために送るパラメータの名前。
 *
 * @remarks
 * Resource Owner Password Credentials の利用者名の欄をそのまま使います。開発用の IdP は
 * 受け取った利用者名を `sub` に据えたトークンを返すので、照合する相手が居なくても主体を
 * 名指しできます。
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
 * この口が繋ぐ相手に求める性質。
 *
 * @remarks
 * 失敗したときに、**何を満たす相手が居ないのか**を利用者へ返すために持ちます。製品名で書かない
 * のは、繋ぐ相手が入れ替わるためです —— 名前で名乗ると、入れ替わった瞬間に案内が嘘になりますが、
 * 性質なら次の相手にもそのまま当たります。
 *
 * 公開するのは、**失敗の文面がこれを名乗ることを外から確かめられるようにする**ためです。写した
 * 側だけが古い文言を持つ状態を作らずに済みます。
 */
export const REQUIRED_IDP =
  "OIDC Discovery を公開し、Resource Owner Password Credentials で主体を名指しできる開発用 IdP";

/**
 * 開発用の IdP から、指定した主体のアクセストークンを取る。
 *
 * @remarks
 * **相手は製品ではなく性質で決まります。** {@link REQUIRED_IDP} を満たす IdP なら何でもよく、
 * このリポジトリはどれかを同梱しません。**別の IdP へ移るなら、書き換えるのはこのファイルだけ**
 * です。呼び出し側（`/dev/session`）が知っているのは「主体と接続先を渡すとトークンが返る」こと
 * だけで、取り方は知りません。
 *
 * **本物の IdP でこの付与方式を使ってはいけません**（OAuth 2.1 で廃止済み）。ここで通るのは、
 * 照合する相手が居ない開発用の実装だからです。
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
 * @throws 宛先が {@link REQUIRED_IDP} として応えないとき。どの段で応えなかったかを添える
 */
export async function issueDevelopmentAccessToken(input: {
  readonly subject: string;
  readonly issuer: string;
}): Promise<string> {
  const { subject, issuer } = input;
  const { clientId } = getAuthConfig();
  const { maxUrlBytes } = getHttpConfig();

  const { tokenEndpoint } = await fetchOidcEndpoints(issuer, maxUrlBytes).catch(
    rethrowAs(issuer, "OIDC Discovery から接続先を引けませんでした"),
  );
  const client = createHttpClient({ scope: "user-scoped", baseUrl: issuer, maxUrlBytes });

  const { access_token } = await client
    .request({
      path: tokenEndpoint,
      method: "POST",
      form: {
        grant_type: "password",
        client_id: clientId,
        password: UNUSED_PASSWORD,
        [SUBJECT_PARAM]: subject,
      },
      schema: TokenResponse,
    })
    .catch(rethrowAs(issuer, "主体を名指ししたトークンを取れませんでした"));

  return access_token;
}

/**
 * 失敗に、どの宛先がどの段で応えなかったかを載せて投げ直す。
 *
 * @remarks
 * **載せるのは文言だけで、分類は作り直しません。** 到達できないのか、応答が期待の形でないのかは
 * 下の層が既に分けており（`UNAVAILABLE` / `INTERNAL` / `UNAUTHENTICATED`）、ここで新しい失敗へ
 * 詰め替えると「立っていない」と「立っているが違うものだった」が同じ顔になります。cause の鎖を
 * 保ったまま被せることで、分類は下の層のものが残ります。
 *
 * 文言をここが持つのは、**カタログの既定文言が分類しか伝えないため**です。「接続できません」では、
 * IdP を立て忘れたのか、宛先を打ち間違えたのか、別の組を指したのかが同じ文面になります。宛先を
 * 必ず書けるのは、この口が設定ではなく画面から宛先を受け取るからです。
 *
 * @param issuer - 応えなかった宛先
 * @param stage - その宛先が満たさなかったこと
 */
function rethrowAs(issuer: string, stage: string): (cause: unknown) => never {
  return (cause: unknown) => {
    throw withErrorMeta(
      new Error(`${issuer} が ${stage}`, { cause }),
      createErrorMeta({ message: `${issuer} が ${stage}。求めているのは ${REQUIRED_IDP} です。` }),
    );
  };
}

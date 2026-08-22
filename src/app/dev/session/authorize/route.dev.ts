import { isDevelopmentAccessAllowed } from "@/adapters/server/auth/development-access";
import { issueDevelopmentAuthorizationCode } from "@/adapters/server/auth/development-authorization-code";
import { AUTHORIZE_ERROR, authorizeFailurePath } from "@/features/dev-session/authorize-error";
import { parseDevSessionForm } from "@/features/dev-session/parse-session-form";
import { RETURN_URL_PARAM, STATE_PARAM } from "@/features/dev-session/paths";
import { toSafeReturnUrl } from "@/model/return-url";

import { toSessionInput } from "../to-session-input";

/** 認可の応答を受け取る口。app 層の中の別の口なので、相対のまま指す。 */
const AUTH_CALLBACK_PATH = "/api/auth/callback";

/**
 * 開発用 IdP の認可 endpoint。
 *
 * @remarks
 * **Server Action ではなく Route Handler です。** 認可の応答は `/api/auth/callback` へ戻す必要が
 * あり、Server Action の `redirect()` は Route Handler へ遷移できません —— client router が
 * 飲み込み、要求そのものが出ません（URL だけが書き換わります）。素の form 送信ならブラウザが
 * 遷移するので、往復が本番と同じ経路を通ります。
 *
 * 実在の IdP でも、ログイン画面は認可 endpoint へ送信し、そこが応答を持って戻します。この口は
 * その役どころに対応します。
 *
 * **開ける環境の判定をここでも行います。** 画面とは別の入口であり、画面を経由せずに呼べます。
 * 入口ごとに閉じていなければ、閉じたことになりません。
 *
 * 失敗は分類だけを載せて画面へ戻します。項目ごとの理由を返さないのは、実在の IdP の認可
 * endpoint も `error` の分類しか戻さないためで、項目ごとの理由は自分の画面へ留まる送信
 * （その場で発行する経路）が持ちます。
 *
 * @returns 認可の応答への 303。開けていない環境では 404、対応づける値が無ければ 400
 */
export async function POST(request: Request): Promise<Response> {
  if (!(await isDevelopmentAccessAllowed())) {
    // 403 にしない。存在を知らせないほうが、設定を誤ったまま公開したときの被害が小さい。
    return new Response(null, { status: 404 });
  }

  const formData = await request.formData();
  const state = formData.get(STATE_PARAM)?.toString() ?? "";
  const returnUrl = toSafeReturnUrl(formData.get(RETURN_URL_PARAM)?.toString());

  if (state === "") {
    // 対応づける値が無い送信は認可の往復の外から来ている。戻す先も決められない。
    return new Response(null, { status: 400 });
  }

  const parsed = parseDevSessionForm(formData);

  if (!parsed.ok) {
    return redirectTo(authorizeFailurePath(returnUrl, state, AUTHORIZE_ERROR.INVALID), request);
  }

  let code: string;

  try {
    code = await issueDevelopmentAuthorizationCode(await toSessionInput(parsed.input));
  } catch {
    return redirectTo(authorizeFailurePath(returnUrl, state, AUTHORIZE_ERROR.UNAVAILABLE), request);
  }

  const response = new URLSearchParams({ code, state });

  return redirectTo(`${AUTH_CALLBACK_PATH}?${response.toString()}`, request);
}

/**
 * 送信を受けた要求を、次の面へ GET で送り出す。
 *
 * @remarks
 * 303 にします。302 のままだと、戻した先をブラウザが POST で開き直しうるためです。
 */
function redirectTo(path: string, request: Request): Response {
  return Response.redirect(new URL(path, request.url), 303);
}

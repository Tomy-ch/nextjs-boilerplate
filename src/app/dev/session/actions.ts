"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDevelopmentAccessAllowed } from "@/adapters/server/auth/development-access";
import { issueDevelopmentAuthorizationCode } from "@/adapters/server/auth/development-authorization-code";
import { issueDevelopmentAccessToken } from "@/adapters/server/auth/development-token";
import { discardTestSession, issueTestSession } from "@/adapters/server/auth/test-session";
import type { TestSessionSpec } from "@/adapters/server/auth/test-session-record";
import type {
  DevSessionFormState,
  DiscardSessionFormState,
} from "@/features/dev-session/form-state";
import {
  type DevSessionParseResult,
  parseDevSessionForm,
} from "@/features/dev-session/parse-session-form";
import { DEV_SESSION_PATH, RETURN_URL_PARAM, STATE_PARAM } from "@/features/dev-session/paths";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { toSafeReturnUrl } from "@/model/return-url";

/** 認可の応答を受け取る口。app 層の中の別の口なので、相対のまま指す。 */
const AUTH_CALLBACK_PATH = "/api/auth/callback";

const CLOSED_MESSAGE = "この口は、開発と CI の手元の宛先でだけ開きます。";
const INVALID_INPUT_MESSAGE = "指定を確認してください。";

/** 解いた指定を、封緘に渡せる形へ揃える。取りに行く経路だけがここで IdP を叩く。 */
async function toSessionInput(
  input: Extract<DevSessionParseResult, { ok: true }>["input"],
): Promise<TestSessionSpec> {
  if (!input.issueAccessToken) {
    const { issueAccessToken: _, ...session } = input;

    return session;
  }

  const { issueAccessToken: _, issuer, ...session } = input;

  return {
    ...session,
    accessToken: await issueDevelopmentAccessToken({ subject: session.subject, issuer }),
  };
}

/**
 * 発行を済ませ、次に送る先を返す。
 *
 * @remarks
 * **認可の往復の途中で開かれたなら、session をここでは置きません。** 認可コードを渡して
 * `/api/auth/callback` へ返し、session を置くのは向こうにさせます。ここで置いてしまうと、`AUTH_MODE=dev`
 * の間だけ callback が一度も踏まれず、一時状態の cookie も消費されずに残ります。認可の往復が
 * 壊れていても、開発と CI では最後まで気づけません。
 *
 * 直接開かれたときは今までどおりその場で置きます。突き合わせる一時状態が無いため、callback へ
 * 返しても認証をやり直させられるだけです。
 */
async function issueAndResolveDestination(
  spec: TestSessionSpec,
  authorizationState: string | null,
  returnUrl: string,
): Promise<string> {
  if (authorizationState === null) {
    await issueTestSession(spec);

    return returnUrl;
  }

  const query = new URLSearchParams({
    code: await issueDevelopmentAuthorizationCode(spec),
    state: authorizationState,
  });

  return `${AUTH_CALLBACK_PATH}?${query.toString()}`;
}

/**
 * IdP を通さずに session を発行する。
 *
 * @remarks
 * **開ける環境の判定をここでも行います。** 画面の側でも同じ判定をしていますが、Server Action は
 * 画面とは別の入口であり、画面を経由せずに呼べます。入口ごとに閉じていなければ、閉じたことに
 * なりません。
 *
 * app 層に置くのは、session の封緘が `adapters/server/auth` の領分で、そこへ触れてよいのが
 * app 層だからです（`architecture.ts` の `adapters-auth`）。画面の側は送信先を受け取るだけです。
 *
 * **トークンを IdP から取るかどうかを、ここで分岐させます。** 画面は「取る」という指定を送る
 * だけで取り方を知らず、取り方は `adapters/server/auth/development-token.ts` が 1 か所で持ちます。
 * 取れなかったときは発行そのものを行いません —— 検証される先があるのにトークンだけ偽物、という
 * session を作ると、失敗が API を叩くところまで遅れて現れます。
 *
 * 戻り先は同じ生成元の中だけに絞ります。受け取った値をそのまま使うと、発行した直後に外部の
 * サイトへ送る導線になります。
 */
export async function issueDevSessionAction(
  _previous: DevSessionFormState,
  formData: FormData,
): Promise<DevSessionFormState> {
  if (!(await isDevelopmentAccessAllowed())) {
    return failedActionState({ formError: CLOSED_MESSAGE });
  }

  const parsed = parseDevSessionForm(formData);

  if (!parsed.ok) {
    return failedActionState({
      formError: INVALID_INPUT_MESSAGE,
      fieldErrors: parsed.fieldErrors,
    });
  }

  let destination: string;

  try {
    destination = await issueAndResolveDestination(
      await toSessionInput(parsed.input),
      formData.get(STATE_PARAM)?.toString() ?? null,
      toSafeReturnUrl(formData.get(RETURN_URL_PARAM)?.toString()),
    );
  } catch (error) {
    return actionStateFromError(error);
  }

  redirect(destination);
}

/**
 * 発行した session を捨てる。
 *
 * @remarks
 * 画面に留まります。捨てた結果は同じ画面が出し直す「いまの session」に現れるため、別の場所へ
 * 送る理由がありません。
 */
export async function discardDevSessionAction(
  _previous: DiscardSessionFormState,
  _formData: FormData,
): Promise<DiscardSessionFormState> {
  if (!(await isDevelopmentAccessAllowed())) {
    return failedActionState({ formError: CLOSED_MESSAGE });
  }

  try {
    await discardTestSession();
  } catch (error) {
    return actionStateFromError(error);
  }

  revalidatePath(DEV_SESSION_PATH);

  return succeededActionState(undefined);
}

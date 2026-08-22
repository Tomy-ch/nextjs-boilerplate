import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDevelopmentAccessAllowed } from "@/adapters/server/auth/development-access";
import { verifySession } from "@/adapters/server/auth/session";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { getApiConfig } from "@/config/api/api.server";
import { getAuthConfig } from "@/config/auth/auth.server";
import { AUTHORIZE_ERROR_MESSAGE } from "@/features/dev-session/authorize-error";
import { RETURN_URL_PARAM, STATE_PARAM } from "@/features/dev-session/paths";
import { readAuthorizeError } from "@/features/dev-session/read-authorize-error";
import { DevSessionView } from "@/features/dev-session/view";
import { toSafeReturnUrl } from "@/model/return-url";
import type { RawSearchParams } from "@/model/search-params";

import { discardDevSessionAction, issueDevSessionAction } from "./actions";

export const metadata: Metadata = {
  title: "開発用 session",
  robots: { index: false, follow: false },
};

/**
 * 開発用 session の発行。
 *
 * @remarks
 * **開発と CI でだけ開きます。** それ以外の環境では `not-found` になり、面ごと存在しません。
 * 403 にしないのは、存在を知らせないほうが設定を誤ったまま公開したときの被害が小さいためです。
 *
 * 外枠（`(shop)` の layout）の内側に置きません。買い物の導線とは別物で、header の nav に並べる
 * ものでもないためです。
 *
 * **session の読み取りと送信先をここが持ちます。** `adapters/server/auth` へ触れてよいのは app 層で
 * （`architecture.ts` の `adapters-auth`）、画面の側は受け取った値と送信先を使うだけです。
 *
 * 戻り先は同じ生成元の中だけに絞ります。受け取った値をそのまま渡すと、発行した直後に外部の
 * サイトへ送る導線になります。
 *
 * 要求と応答を対応づける値は**検証しません**。載っているかどうかだけを見て、そのまま送信へ渡します。
 * 正しさを判定するのは `/api/auth/callback` が復元する一時状態との突合であり、ここで別に判定すると
 * 判定が 2 か所に分かれます。
 *
 * **認可 endpoint が戻した理由は、ここが文言へ直します。** 素の form 送信は状態を持ち越せないため、
 * 分類だけが URL で届きます。宣言に無い値は案内しません —— URL は利用者が直接編集でき、載っている
 * 文字列を根拠に画面を変えると、任意の案内を出させる導線になります。
 */
export default async function DevSessionPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  if (!(await isDevelopmentAccessAllowed())) {
    notFound();
  }

  const params = await searchParams;
  const returnUrl = params[RETURN_URL_PARAM];
  const authorizationState = params[STATE_PARAM];
  const error = readAuthorizeError(params);

  return (
    <ContentContainer className="py-8">
      <PageHeader>
        <div>
          <PageHeaderTitle>開発用 session</PageHeaderTitle>
          <PageHeaderDescription>
            IdP を通さずに session を発行します。この画面は開発と CI でだけ開きます。
          </PageHeaderDescription>
        </div>
      </PageHeader>
      <DevSessionView
        authorizationState={typeof authorizationState === "string" ? authorizationState : null}
        connectsLiveApi={getApiConfig().mode === "live"}
        formError={error === null ? null : AUTHORIZE_ERROR_MESSAGE[error]}
        defaultIssuer={getAuthConfig().issuer}
        discardAction={discardDevSessionAction}
        issueAction={issueDevSessionAction}
        returnUrl={toSafeReturnUrl(typeof returnUrl === "string" ? returnUrl : undefined)}
        session={await verifySession()}
      />
    </ContentContainer>
  );
}

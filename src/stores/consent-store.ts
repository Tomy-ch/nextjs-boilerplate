"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";

import {
  CONSENT_COOKIE_NAME,
  CONSENT_MAX_AGE_SECONDS,
  type ConsentChoice,
  type ConsentState,
  parseConsentState,
  toConsentCookieValue,
  UNREAD_CONSENT,
} from "@/model/consent";

/** 同意状態を保つ横断 client 状態。 */
type ConsentStore = {
  /** いま分かっている同意状態。 */
  state: ConsentState;
};

/**
 * cookie から同意状態を読む。
 *
 * @remarks
 * サーバでは読めないため `"unread"` を返します。ここで「未選択」を返すと、選び終えた利用者にも
 * サーバ描画の時点でバナーが出ます。
 */
function readConsentCookie(): ConsentState {
  if (typeof document === "undefined") {
    return UNREAD_CONSENT;
  }

  const found = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`));

  return parseConsentState(found?.slice(CONSENT_COOKIE_NAME.length + 1));
}

/**
 * 選ばれた意思を cookie へ書く。
 *
 * @remarks
 * **`httpOnly` を付けられません。** 同じ値をこの層が読み、バナーを出すかどうかを決めるためです。
 * 載るのは「同意したかどうか」だけで、身元も識別子も含みません。
 *
 * `secure` は https で配信されているときだけ付けます。常に付けると `http://localhost` の開発で
 * 保存されず、選んでも次の描画でまた尋ねることになります。
 */
function writeConsentCookie(choice: ConsentChoice): void {
  const attributes = [
    `max-age=${CONSENT_MAX_AGE_SECONDS}`,
    "path=/",
    "samesite=lax",
    ...(location.protocol === "https:" ? ["secure"] : []),
  ];

  document.cookie = `${CONSENT_COOKIE_NAME}=${toConsentCookieValue(choice)}; ${attributes.join("; ")}`;
}

/**
 * 同意状態を配る store。
 *
 * @remarks
 * **cookie は module の読み込み時に一度だけ読みます。** 書き換えるのはこの store だけなので、
 * 描画のたびに読み直す理由がありません。
 */
const useConsentStore = create<ConsentStore>(() => ({ state: readConsentCookie() }));

/**
 * いまの同意状態を購読する。
 *
 * @remarks
 * **サーバ側の値を明示的に分けます。** store の値をそのまま読むと、cookie を持つブラウザでは
 * hydration の 1 回目がサーバの出力と食い違います。`useSyncExternalStore` に別の初期値を渡すと、
 * React が hydration を済ませてから読み直します。
 *
 * この分け方の帰結として、**バナーは hydration の後に現れます。** サーバは同意状態を知らないため、
 * 知らないまま尋ねるか、知るまで待つかのどちらかしかありません。
 */
export function useConsentState(): ConsentState {
  return useSyncExternalStore(
    useConsentStore.subscribe,
    () => useConsentStore.getState().state,
    () => UNREAD_CONSENT,
  );
}

/**
 * 選ばれた意思を保存し、ツリーへ反映する。
 *
 * @remarks
 * 保存と反映を 1 つにします。別々に呼べる形にすると、書いたが反映していない状態と、その逆を
 * 作れます。
 *
 * @param choice - 利用者が選んだ意思
 */
export function decideConsent(choice: ConsentChoice): void {
  writeConsentCookie(choice);
  useConsentStore.setState({ state: { status: "decided", optional: choice } });
}

import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import type { Session } from "@/model/session";

import { getSessionResolver } from "./resolver";
import {
  baseCookieOptions,
  parseTransactionCookie,
  SESSION_COOKIE_NAME,
  TRANSACTION_COOKIE_NAME,
  TRANSACTION_MAX_AGE_SECONDS,
} from "./session-cookie";
import type { AuthorizationTransaction, SessionRecord } from "./session-resolver";

/**
 * cookie から session とトークンを復元する。
 *
 * @remarks
 * `adapters/server` の外へ出しません。返り値には Access Token が含まれるため、内側の層が
 * これを呼べると「うっかり client へ渡す」経路が生まれます。内側が使うのは
 * {@link verifySession} です。
 *
 * 1 リクエストの中で何度呼んでも復号は 1 度で済むよう memo 化します。認可の検査はデータ源の
 * 近くで何度も行われる想定であり、その都度復号すると回数がそのまま費用になります。
 */
const readSessionRecord = cache(async (): Promise<SessionRecord | null> => {
  const sealed = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (sealed === undefined) {
    return null;
  }

  return getSessionResolver().restore(sealed);
});

/**
 * 確定認可の入口。session を検証して身元を返す。
 *
 * @remarks
 * データ取得・Server Action・Route Handler は、進む前に必ずここを通します
 * （[0079](../../../../docs/adr/0079-auth-frontend-seam.md)）。`proxy.ts` の楽観判定は
 * 入口の前捌きに過ぎず、防御線はこちら側です。
 *
 * 返すのは身元だけで、トークンは含めません。
 *
 * @returns 未認証・失効・復号できないときは null
 */
export const verifySession = cache(async (): Promise<Session | null> => {
  return (await readSessionRecord())?.session ?? null;
});

/**
 * 認証済みの API 呼び出しに付ける Bearer を返す。
 *
 * @remarks
 * 呼び出し側が個別に Authorization ヘッダを組み立てないよう、取り出し口をここに 1 つだけ
 * 置きます（[0079](../../../../docs/adr/0079-auth-frontend-seam.md) §6）。
 *
 * @returns 未認証なら null
 */
export async function getAccessToken(): Promise<string | null> {
  return (await readSessionRecord())?.accessToken ?? null;
}

/**
 * session を cookie へ載せる。
 *
 * @remarks
 * cookie の寿命は session の失効時刻に合わせます。長く持たせても、中の Access Token が
 * 期限切れになった時点で API が通らなくなるだけです。
 */
export async function storeSession(record: SessionRecord): Promise<void> {
  const sealed = await getSessionResolver().seal(record);
  const maxAge = Math.max(0, Math.floor((record.session.expiresAt.getTime() - Date.now()) / 1000));

  (await cookies()).set(SESSION_COOKIE_NAME, sealed, { ...baseCookieOptions(), maxAge });
}

/**
 * ログアウトする。自分の cookie を破棄し、続けて IdP 側の session も終わらせる。
 *
 * @remarks
 * **cookie の破棄を先に行い、これは必ず成功します。** IdP への終了要求はそのあとです。順序を
 * 逆にすると、IdP が応答しないときに手元の session まで残ります。
 *
 * IdP 側の終了に失敗したときは投げます。呼び出し側は「自分の session は既に消えている」ことを
 * 前提に、利用者へ何を見せるかを決められます。ここで握り潰すと、IdP に session が残ったことを
 * 誰も知れなくなります。
 *
 * @throws IdP 側の session を終わらせられなかったとき
 */
export async function signOut(): Promise<void> {
  const record = await readSessionRecord();

  (await cookies()).delete(SESSION_COOKIE_NAME);

  if (record !== null) {
    await getSessionResolver().endSession(record);
  }
}

/** 認可要求の一時状態を cookie へ載せる。 */
export async function storeTransaction(transaction: AuthorizationTransaction): Promise<void> {
  (await cookies()).set(TRANSACTION_COOKIE_NAME, JSON.stringify(transaction), {
    ...baseCookieOptions(),
    maxAge: TRANSACTION_MAX_AGE_SECONDS,
  });
}

/**
 * 認可要求の一時状態を取り出し、同時に破棄する。
 *
 * @remarks
 * 取り出しと破棄を分けません。一時状態は 1 回の往復でだけ有効であり、残しておくと同じ
 * `state` と検証子で 2 度目の交換を試せます。
 *
 * @returns 無い、または解釈できなければ null
 */
export async function takeTransaction(): Promise<AuthorizationTransaction | null> {
  const store = await cookies();
  const transaction = parseTransactionCookie(store.get(TRANSACTION_COOKIE_NAME)?.value);

  store.delete(TRANSACTION_COOKIE_NAME);

  return transaction;
}

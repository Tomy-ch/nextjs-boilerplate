import "server-only";

import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import type {
  InquiryHistory,
  InquiryId,
  InquiryListPage,
  InquiryMessage,
} from "@/model/inquiry/inquiry";
import { toInquiryId } from "@/model/inquiry/inquiry";

import {
  GetInquiriesDetailMessagesResponse,
  GetInquiriesMeMessagesResponse,
  GetInquiriesResponse,
  PostInquiriesDetailMessagesResponse,
  PostInquiriesMeMessagesResponse,
} from "../../gen/api/endpoints.zod";
import type { InquiryMessagePostRequest } from "../../gen/api/model";
import { getAccessToken } from "../auth/session";
import { createHttpClient, type UserScopedHttpClient } from "../http/request";

const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

const MY_MESSAGES_PATH = "/v1/inquiries/me/messages";

const INQUIRIES_PATH = "/v1/inquiries";

type WireHistory = z.infer<typeof GetInquiriesMeMessagesResponse>;
type WireMessage = WireHistory["messages"][number];
type WireList = z.infer<typeof GetInquiriesResponse>;

let client: UserScopedHttpClient | undefined;

/**
 * 問い合わせの口が使う接続先。
 *
 * @returns 問い合わせ用の client
 */
function getClient(): UserScopedHttpClient {
  client ??= createHttpClient({
    scope: "user-scoped",
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    getBearerToken: getAccessToken,
  });

  return client;
}

/**
 * 契約のメッセージを表示用の型へ写す。所属する問い合わせは履歴の側が持つため落とす。
 *
 * @param wire - 契約のメッセージ
 * @returns 表示用のメッセージ
 */
function toMessage(wire: WireMessage): InquiryMessage {
  return {
    id: wire.id,
    authorKind: wire.authorKind,
    body: wire.body,
    sequence: wire.sequence,
    createdAt: new Date(wire.createdAt),
  };
}

/**
 * 契約の履歴応答を表示用の型へ写す。
 *
 * @param wire - 契約の履歴応答
 * @returns 表示用の履歴
 */
function toHistory(wire: WireHistory): InquiryHistory {
  return {
    inquiryId:
      wire.inquiryId === undefined || wire.inquiryId === null ? null : toInquiryId(wire.inquiryId),
    messages: wire.messages.map(toMessage),
    nextAfterSequence: wire.nextAfterSequence ?? null,
    streamCursor: wire.streamCursor,
  };
}

/**
 * 契約の一覧応答を表示用の 1 ページへ写す。
 *
 * @param wire - 契約の一覧応答
 * @returns 表示用の 1 ページ
 */
function toListPage(wire: WireList): InquiryListPage {
  return {
    items: wire.items.map((item) => ({
      id: toInquiryId(item.id),
      userId: item.userId,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })),
    nextCursor: wire.nextCursor ?? null,
  };
}

/**
 * 位置を指定した取得のクエリ。先頭から読むときは何も付けない。
 *
 * @param afterSequence - この位置より後ろを取得する。先頭から読むときは undefined
 * @returns クエリに載せる検索条件。先頭から読むときは undefined
 */
function afterSequenceParams(
  afterSequence: number | undefined,
): Readonly<Record<string, string>> | undefined {
  return afterSequence === undefined ? undefined : { afterSequence: String(afterSequence) };
}

/**
 * 自分の問い合わせの履歴を 1 ページ取得する。
 *
 * @remarks
 * **まだ 1 通も送っていない利用者にも成功が返ります。** 問い合わせが無いことは誤りではないと
 * 契約が定めており、空の履歴と開始位置 `0` が返ります。画面は取得の失敗と、まだ何も無い状態を
 * 別のものとして扱えます。
 *
 * 応答の `streamCursor` をそのまま購読の開始位置に渡します。ここで別の値を組み立てると、
 * 取得と購読の間に追加されたメッセージが抜けます。
 *
 * @param afterSequence - この位置より後ろを取得する。先頭から読むときは省略する
 * @returns 履歴の 1 ページ
 */
export async function getMyInquiryHistory(afterSequence?: number): Promise<InquiryHistory> {
  return toHistory(
    await getClient().request({
      path: MY_MESSAGES_PATH,
      searchParams: afterSequenceParams(afterSequence),
      schema: GetInquiriesMeMessagesResponse,
    }),
  );
}

/**
 * 自分の問い合わせへ 1 通追加する。
 *
 * @remarks
 * **最初の 1 通が問い合わせを作ります。** 作成の口は契約に無く、利用者は 1 件だけを持ちます。
 *
 * **冪等キーは必ず付けます。** 契約では任意ですが、メッセージは自然キーを持たないため、
 * 付けない再送はそのまま 2 通目になります。
 *
 * @param body - メッセージの本文
 * @param idempotencyKey - 再送を初回の結果へ畳むための鍵
 * @returns 追加されたメッセージ。位置と識別子が確定しているため、楽観追加した行を置き換えられる
 */
export async function postMyInquiryMessage(
  body: string,
  idempotencyKey: string,
): Promise<InquiryMessage> {
  const wire = await getClient().request({
    path: MY_MESSAGES_PATH,
    method: "POST",
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    body: { body } satisfies InquiryMessagePostRequest,
    idempotent: true,
    schema: PostInquiriesMeMessagesResponse,
  });

  return toMessage(wire.message);
}

/**
 * 問い合わせの一覧を 1 ページ取得する（運営）。
 *
 * @remarks
 * 更新日時の新しい順です。本文を持たないため、一覧は行だけで組み立てます。
 *
 * @param after - 前のページが返した cursor。先頭なら省略
 * @returns 問い合わせ一覧の 1 ページ
 */
export async function listInquiries(after?: string): Promise<InquiryListPage> {
  return toListPage(
    await getClient().request({
      path: INQUIRIES_PATH,
      searchParams: after === undefined ? undefined : { after },
      schema: GetInquiriesResponse,
    }),
  );
}

/**
 * 任意の問い合わせの履歴を 1 ページ取得する（運営）。形も開始位置の使い方も自分の履歴と同じ。
 *
 * @param inquiryId - 対象の問い合わせ
 * @param afterSequence - この位置より後ろを取得する。先頭から読むときは省略する
 * @returns 履歴の 1 ページ
 */
export async function getInquiryHistory(
  inquiryId: InquiryId,
  afterSequence?: number,
): Promise<InquiryHistory> {
  return toHistory(
    await getClient().request({
      path: `${INQUIRIES_PATH}/${encodeURIComponent(inquiryId)}/messages`,
      searchParams: afterSequenceParams(afterSequence),
      schema: GetInquiriesDetailMessagesResponse,
    }),
  );
}

/**
 * 問い合わせへ回答を 1 通追加する（運営）。送り手は運営として記録される。
 *
 * @param inquiryId - 対象の問い合わせ
 * @param body - 回答の本文
 * @param idempotencyKey - 再送を初回の結果へ畳むための鍵
 * @returns 追加された回答
 */
export async function postInquiryReply(
  inquiryId: InquiryId,
  body: string,
  idempotencyKey: string,
): Promise<InquiryMessage> {
  const wire = await getClient().request({
    path: `${INQUIRIES_PATH}/${encodeURIComponent(inquiryId)}/messages`,
    method: "POST",
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    body: { body } satisfies InquiryMessagePostRequest,
    idempotent: true,
    schema: PostInquiriesDetailMessagesResponse,
  });

  return toMessage(wire.message);
}

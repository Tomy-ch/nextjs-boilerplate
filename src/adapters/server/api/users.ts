import "server-only";

import { cache } from "react";
import type { z } from "zod";

import { getApiConfig } from "@/config/api/api.server";
import { getHttpConfig } from "@/config/http/http.server";
import { getLogger } from "@/logging/logging.server";
import type { PurchaseSummary, UserProfile } from "@/model/user/user";

import {
  DeleteUsersDetailResponse,
  GetUsersMePurchasesSummaryResponse,
  GetUsersMeResponse,
  PutUsersDetailResponse,
} from "../../gen/api/endpoints.zod";
import type { UserPutRequest } from "../../gen/api/model";
import { getAccessToken, signOut } from "../auth/session";
import { createHttpClient, type HttpClient } from "../http/request";

type WireUser = z.infer<typeof GetUsersMeResponse>;

let client: HttpClient | undefined;

function getClient(): HttpClient {
  client ??= createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    maxUrlBytes: getHttpConfig().maxUrlBytes,
    getBearerToken: getAccessToken,
  });

  return client;
}

/**
 * 自分の情報を契約の形のまま取る。
 *
 * @remarks
 * 外へは出しません。`id` を含むためで、これは更新と退会が対象を指すのに使う内部の識別子です。
 * 画面へ渡すと、ブラウザに置く理由の無い値がフォームの hidden や DOM に載ります。識別子は
 * この境界の内側で解決します。
 *
 * memo 化するのは、1 リクエストの中で表示と更新の双方がこれを引くためです。
 */
const getMyUser = cache(async (): Promise<WireUser> => {
  return getClient().request({ path: "/v1/users/me", schema: GetUsersMeResponse });
});

/** 契約の応答を表示用の型へ写す。 */
function toUserProfile(wire: WireUser): UserProfile {
  return {
    firstName: wire.firstName,
    lastName: wire.lastName,
    email: wire.email,
    phone: wire.phone,
    postalCode: wire.postalCode,
    prefecture: wire.prefecture,
    city: wire.city,
    street: wire.street,
    building: wire.building ?? null,
  };
}

/** 自分のプロフィールを取得する。 */
export async function getMyProfile(): Promise<UserProfile> {
  return toUserProfile(await getMyUser());
}

/**
 * 自分の購入の集計を取得する。
 *
 * @remarks
 * ステータスは ID と名称が解決済みで届くため、名称を引き直しません。
 */
export const getMyPurchaseSummary = cache(async (): Promise<PurchaseSummary> => {
  const wire = await getClient().request({
    path: "/v1/users/me/purchases/summary",
    schema: GetUsersMePurchasesSummaryResponse,
  });

  return {
    totalCount: wire.totalCount,
    totalAmount: wire.totalAmount,
    breakdown: wire.statusBreakdown.map(({ status, count, totalAmount }) => ({
      statusId: status.id,
      statusName: status.name,
      count,
      totalAmount,
    })),
  };
});

/**
 * 自分のプロフィールを更新する。
 *
 * @remarks
 * 契約は全項目の置換（`PUT`）を要求します。部分更新の口もありますが、フォームが常に全項目を
 * 持って送るため、送った内容がそのまま更新後の状態になる形を選びます。
 *
 * @returns 更新後のプロフィール
 */
export async function updateMyProfile(profile: UserProfile): Promise<UserProfile> {
  const { id } = await getMyUser();

  const wire = await getClient().request({
    path: `/v1/users/${id}`,
    method: "PUT",
    body: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      postalCode: profile.postalCode,
      prefecture: profile.prefecture,
      city: profile.city,
      street: profile.street,
      building: profile.building,
    } satisfies UserPutRequest,
    schema: PutUsersDetailResponse,
  });

  return toUserProfile(wire);
}

/**
 * 退会し、続けて session を終わらせる。
 *
 * @remarks
 * 進行中の購入が残っていると契約は `409` を返します。呼び出し側はその分類を受けて、退会が
 * 成立しなかったことを伝えます。
 *
 * session の破棄をここに含めるのは、退会が成立した時点で手元の cookie が「消えた利用者を
 * 指す session」になるためです。残すと、無効になった身元のまま画面を回れます。
 *
 * IdP 側の終了に失敗しても退会は成立として返します。cookie の破棄は先に必ず済んでおり、
 * 利用者から見た結果は変わりません。IdP に session が残ったことは運用が拾えるよう記録します。
 */
export async function withdrawMe(): Promise<void> {
  const { id } = await getMyUser();

  await getClient().request({
    path: `/v1/users/${id}`,
    method: "DELETE",
    schema: DeleteUsersDetailResponse,
  });

  try {
    await signOut();
  } catch (cause) {
    getLogger().warn("退会後の IdP session 終了に失敗しました", { cause: String(cause) });
  }
}

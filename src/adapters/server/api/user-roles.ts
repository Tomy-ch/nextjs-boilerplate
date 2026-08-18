import "server-only";

import { getApiConfig } from "@/config/api/api.server";
import { SESSION_ROLE, type SessionRole } from "@/model/session";

import { GetUsersMeRolesResponse } from "../../gen/api/endpoints.zod";
import { createHttpClient } from "../http/request";

/** 管理者を表すロールコード。契約が持つ安定コードで、表示名では判定しない。 */
const ADMIN_ROLE_CODE = "admin";

const ROLES_PATH = "/v1/users/me/roles";

/**
 * 認証済みの主体が持つ役割を、バックエンドから引く。
 *
 * @remarks
 * **役割の正本は IdP ではなくバックエンドです。** ロールは業務側のデータであり、IdP が持つのは
 * 身元だけです（[0070](../../../../docs/adr/0070-backend-role-separation.md)）。ID Token の claim
 * から読むと、IdP を差し替えるたびに役割の出所が変わります。
 *
 * **session を確立する途中で呼ぶため、トークンを引数で受け取ります。** この時点では cookie が
 * まだ無く、通常の取得口（cookie から Bearer を組む）は使えません。
 *
 * 役割が 1 つも無い主体は一般利用者として扱います。空配列はエラーではなく、契約がそう定めています。
 *
 * @param accessToken - 確立しようとしている session の Access Token
 */
export async function fetchSessionRole(accessToken: string): Promise<SessionRole> {
  const wire = await createHttpClient({
    baseUrl: getApiConfig().baseUrl,
    getBearerToken: async () => accessToken,
  }).request({ path: ROLES_PATH, schema: GetUsersMeRolesResponse });

  return wire.roles.some((role) => role.code === ADMIN_ROLE_CODE)
    ? SESSION_ROLE.admin
    : SESSION_ROLE.user;
}

import { z } from "zod";

import { issueTestSession } from "@/adapters/server/auth/test-session";
import { findExplicitApplicationEnvironment } from "@/config/load-environment";
import { SESSION_ROLE } from "@/model/session";

/**
 * この口を開ける環境。
 *
 * @remarks
 * 開発と CI だけです。ここに `dev` / `stg` / `prd` を足すと、**誰でも任意の役割の session を
 * 発行できる口**が実環境に開きます。判定を API の接続モードではなく環境そのものに置いているのは、
 * 接続モードが「mock を実環境に置かない」という散文の約束でしか守られていないためです。
 *
 * **`APP_ENV` が明示されていることも要求します。** 未設定を既定値へ落とすと、設定を忘れた実環境が
 * `local` として扱われ、この口が開きます。開発機で使うときは `APP_ENV=local` を明示してください。
 */
const OPEN_ENVIRONMENTS: readonly string[] = ["local", "ci"];

/** 発行する session の指定。 */
const IssueRequest = z.object({
  /** 誰として振る舞うか。 */
  subject: z.string().min(1).default("user-john-doe"),
  /** 与える役割。 */
  role: z.enum([SESSION_ROLE.admin, SESSION_ROLE.user]).default(SESSION_ROLE.user),
  /** 失効までの秒数。失効の挙動を試すために短くもできる。 */
  expiresInSeconds: z.number().int().positive().default(3600),
});

/**
 * テスト用に session を直接発行する。
 *
 * @remarks
 * 認証は OpenAPI 契約の外にあり、契約から生成したモックでは偽装できません。IdP 自体は
 * バックエンド側の compose の中にあって CI では起動しないため、E2E が「ログイン済みの状態」へ
 * 到達する手段がここ以外にありません。
 *
 * 発行する Access Token は本物ではありません。**この口が開く環境では API 自体もモックされている**
 * ため、Bearer が検証される先がありません。実物のトークンが要るローカル検証では、通常の
 * ログイン経路（`/api/auth/login`）を使います。
 *
 * 制御できる幅は広く取ってあります。役割も失効までの秒数も指定できるのは、テストが到達したい
 * 状態を実システムの都合で狭めないためです。危険は口を開ける環境で閉じます。
 *
 * session の組み立ては `adapters/server` が持ちます。ここが持つのは、開ける環境の判定と
 * 受け取った指定の検証だけです。
 *
 * @returns 発行できたときは 204。開けていない環境では 404
 */
export async function POST(request: Request): Promise<Response> {
  const environment = findExplicitApplicationEnvironment();

  if (environment === null || !OPEN_ENVIRONMENTS.includes(environment)) {
    // 403 にしない。存在を知らせないほうが、設定を誤ったまま公開したときの被害が小さい。
    return new Response(null, { status: 404 });
  }

  const parsed = IssueRequest.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return Response.json({ message: "session の指定が不正です" }, { status: 400 });
  }

  await issueTestSession(parsed.data);

  return new Response(null, { status: 204 });
}

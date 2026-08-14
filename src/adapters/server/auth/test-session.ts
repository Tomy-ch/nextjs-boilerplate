import "server-only";

import type { SessionRole } from "@/model/session";

import { storeSession } from "./session";

/**
 * テスト用の session を発行する。
 *
 * @remarks
 * 実在の IdP を通さずに「ログイン済み」へ到達させる口です。**本番で開いてはならない**ため、
 * 開ける環境の判定は呼び出し側（Route Handler）が持ちます。ここが持つのは、その状態を
 * どう組み立てるかだけです。
 *
 * 組み立てをこの層に置くのは、`SessionRecord` の形を `adapters/server` の外へ出さないためです。
 * Route Handler が形を知っていると、封緘対象が変わるたびに層をまたいで追随修正が要ります。
 *
 * 発行するトークンは本物ではありません。この口が開く環境では API 自体がモックされており、
 * Bearer が検証される先がないためです。
 */
export async function issueTestSession(input: {
  /** 誰として振る舞うか。 */
  readonly subject: string;
  /** 与える役割。 */
  readonly role: SessionRole;
  /** 失効までの秒数。 */
  readonly expiresInSeconds: number;
}): Promise<void> {
  await storeSession({
    session: {
      userId: input.subject,
      role: input.role,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    },
    accessToken: `test-access-token:${input.subject}`,
    idToken: `test-id-token:${input.subject}`,
  });
}

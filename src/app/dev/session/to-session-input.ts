import { issueDevelopmentAccessToken } from "@/adapters/server/auth/development-token";
import type { TestSessionSpec } from "@/adapters/server/auth/test-session-record";
import type { DevSessionParseResult } from "@/features/dev-session/parse-session-form";

/**
 * 解いた指定を、封緘に渡せる形へ揃える。
 *
 * @remarks
 * **取りに行く経路だけがここで IdP を叩きます。** 画面は「取る」という指定を送るだけで取り方を
 * 知らず、取り方は `adapters/server/auth/development-token.ts` が 1 か所で持ちます。
 *
 * 2 つの送信先（その場で発行する Server Action と、認可の応答を返す Route Handler）が同じ形へ
 * 揃える必要があるため、どちらの隣にも置かず独立させています。
 *
 * @throws トークンを取りに行けなかったとき
 */
export async function toSessionInput(
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

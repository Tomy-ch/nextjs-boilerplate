import { z } from "zod";

import type { FieldErrors } from "@/model/action-state";
import { SESSION_ROLE, type SessionRole } from "@/model/session";

/** 発行の指定として受け取る項目。 */
export type DevSessionField = "subject" | "role" | "expiresInSeconds" | "accessToken";

/** 発行する session の指定。 */
type DevSessionInput = {
  readonly subject: string;
  readonly role: SessionRole;
  readonly expiresInSeconds: number;
  /** API へ載せる Bearer。貼らなければ検証されない前提の値が使われる。 */
  readonly accessToken?: string;
};

/** {@link parseDevSessionForm} の結果。 */
export type DevSessionParseResult =
  | { readonly ok: true; readonly input: DevSessionInput }
  | { readonly ok: false; readonly fieldErrors: FieldErrors<DevSessionField> };

/** 失効までの秒数の上限。1 日を超える session を配ると、開発機に長く残り続ける。 */
const MAX_EXPIRES_IN_SECONDS = 86_400;

const devSessionSchema = z.object({
  subject: z.string().min(1, "誰として入るかを指定してください。"),
  role: z.enum([SESSION_ROLE.admin, SESSION_ROLE.user]),
  expiresInSeconds: z.coerce
    .number()
    .int("秒数は整数で指定してください。")
    .positive("秒数は 1 以上で指定してください。")
    .max(MAX_EXPIRES_IN_SECONDS, `秒数は ${MAX_EXPIRES_IN_SECONDS} 以下で指定してください。`),
  accessToken: z.string(),
});

/** `FormData` の 1 項目を文字列として読む。未入力と欠落を同じ空文字へ均す。 */
function readField(formData: FormData, name: DevSessionField): string {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

/**
 * 送信された `FormData` を、発行に渡せる形へ解く。
 *
 * @remarks
 * 貼られたトークンは**形を確かめません**。実物の IdP が出す値の形はこのリポジトリの決め事では
 * ないうえ、確かめたところで受け取る API が拒めば同じ結果になります。空欄は「貼らなかった」で
 * あり、空文字という値ではありません。
 */
export function parseDevSessionForm(formData: FormData): DevSessionParseResult {
  const parsed = devSessionSchema.safeParse({
    subject: readField(formData, "subject"),
    role: readField(formData, "role"),
    expiresInSeconds: readField(formData, "expiresInSeconds"),
    accessToken: readField(formData, "accessToken"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { accessToken, ...rest } = parsed.data;

  return { ok: true, input: accessToken === "" ? rest : { ...rest, accessToken } };
}

import type { ManagedUser, UserId } from "@/model/user/user";

/** 一覧の 1 行として出す利用者。 */
export type AdminUserRow = {
  readonly id: UserId;
  /** 姓名を並べた表示名。 */
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  /** 退会しているか。操作を出すかどうかがこれで決まる。 */
  readonly withdrawn: boolean;
};

/**
 * 利用者を 1 行の形へ写す。
 *
 * @remarks
 * 姓名をここで並べるのは、並べ方が表示の判断だからです。契約は姓と名を別々に返し、どちらを先に
 * 置くかは決めていません。
 *
 * 退会したかを日時ではなく真偽値で持ちます。**いつ退会したかを一覧は出しません** —— 出す先が
 * 無い値を運ぶと、行を見る側が「使っていないが在る」項目を毎回読み飛ばすことになります。
 */
export function toAdminUserRows(users: readonly ManagedUser[]): readonly AdminUserRow[] {
  return users.map((user) => ({
    id: user.id,
    name: `${user.lastName} ${user.firstName}`,
    email: user.email,
    phone: user.phone,
    withdrawn: user.deletedAt !== null,
  }));
}

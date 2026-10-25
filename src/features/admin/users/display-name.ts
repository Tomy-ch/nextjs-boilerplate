import type { ManagedUser } from "@/model/user/user";

/**
 * 姓名を並べた表示名を組む。
 *
 * @remarks
 * 姓名をここで並べるのは、並べ方が表示の判断だからです。契約は姓と名を別々に返し、どちらを先に
 * 置くかは決めていません。
 *
 * @param user - 姓と名を持つ利用者
 * @returns 姓・名の順に並べた表示名
 */
export function displayNameOf(user: Pick<ManagedUser, "lastName" | "firstName">): string {
  return `${user.lastName} ${user.firstName}`;
}

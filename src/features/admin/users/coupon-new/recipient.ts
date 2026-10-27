import type { ManagedUser, UserId } from "@/model/user/user";

import { displayNameOf } from "../display-name";

/** 発行の画面が受給者について持つもの。 */
export type IssueRecipient = {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly withdrawn: boolean;
};

/**
 * 利用者を、発行の画面へ渡す受給者の形へ写す。
 *
 * @remarks
 * 画面が使う項目だけを写します。利用者そのものは連絡先を含み、Client Component へ渡せません。
 *
 * @param user - 読んだ利用者
 * @returns 発行の画面へ渡す受給者
 */
export function toIssueRecipient(user: ManagedUser): IssueRecipient {
  return {
    id: user.id,
    name: displayNameOf(user),
    email: user.email,
    withdrawn: user.deletedAt !== null,
  };
}

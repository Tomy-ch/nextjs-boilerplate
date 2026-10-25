import type { ManagedUser, UserId } from "@/model/user/user";

import { displayNameOf } from "../display-name";

export type IssueRecipient = {
  readonly id: UserId;
  readonly name: string;
  readonly email: string;
  readonly withdrawn: boolean;
};

export function toIssueRecipient(user: ManagedUser): IssueRecipient {
  return {
    id: user.id,
    name: displayNameOf(user),
    email: user.email,
    withdrawn: user.deletedAt !== null,
  };
}

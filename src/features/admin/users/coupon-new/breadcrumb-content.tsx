import Link from "next/link";

import { getManagedUser } from "@/adapters/server/api/users";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { getLogger, reportQuietly } from "@/logging/logging.server";
import type { UserId } from "@/model/user/user";

import { ADMIN_USER_LIST_PATH } from "../../paths";
import { displayNameOf } from "../display-name";

export type AdminUserCouponNewBreadcrumbContentProps = {
  id: UserId;
};

async function recipientNameOf(id: UserId): Promise<string | undefined> {
  try {
    return displayNameOf(await getManagedUser(id));
  } catch (cause) {
    if (findAppError(cause)?.kind !== ErrorKind.NOT_FOUND) {
      reportQuietly(() =>
        getLogger().warn("階層に出す利用者を読めませんでした", { cause: String(cause) }),
      );
    }

    return undefined;
  }
}

export async function AdminUserCouponNewBreadcrumbContent({
  id,
}: AdminUserCouponNewBreadcrumbContentProps) {
  const name = await recipientNameOf(id);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={ADMIN_USER_LIST_PATH}>利用者一覧</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {name === undefined ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>クーポンの発行</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

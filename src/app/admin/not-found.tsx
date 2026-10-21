import Link from "next/link";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { getDefaultErrorMeta } from "@/errors/error-catalog";
import { ErrorKind } from "@/errors/error-kind";
import { ADMIN_DASHBOARD_PATH } from "@/features/admin/paths";

/**
 * 管理画面の not-found 境界。
 *
 * @remarks
 * `/admin` の直下へ置きます。ここが無いと配下の `notFound()` が root の not-found まで抜け、
 * 脇の導線もパンくずも失われた素の画面になります。
 *
 * 表示だけを持ちます。文言は分類ごとに `errors` が持つため、ここで組み立てません。
 */
export default function AdminNotFound() {
  return (
    <ContentContainer className="flex flex-col items-start gap-4 py-8">
      <h1 className="font-emphasis text-xl">{getDefaultErrorMeta(ErrorKind.NOT_FOUND).message}</h1>
      <Link className="underline" href={ADMIN_DASHBOARD_PATH}>
        ダッシュボードへ戻る
      </Link>
    </ContentContainer>
  );
}

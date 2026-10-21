import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/design-system/navigation/pagination/pagination";
import { withPartSpan } from "@/observability/render-span";
import { toPageWindow } from "../../page-window";

/** `OffsetPagination` の props。 */
export type OffsetPaginationProps = {
  /** いま見ているページ。1 から数える。 */
  page: number;
  /** 全部で何ページあるか。 */
  pageCount: number;
  /** ページ番号から行き先を組む。画面が URL に持つほかの条件は、ここで保つ。 */
  hrefOf: (page: number) => string;
  /** ページ送りの領域のアクセシブルな名前。 */
  label: string;
};

/**
 * 管理の offset 方式の一覧に置くページ送り。
 *
 * @remarks
 * **任意のページへ跳べます。** 契約が位置と全件数を返す offset 方式のため、次と前しか指せない
 * cursor 方式の一覧とは部品から違います。
 *
 * 端では前後を link にせず、押せない control として残します。消すと残った側が左右へ動き、同じ
 * 場所を狙って押せません（`components/design-system/navigation/pagination`）。
 *
 * **Server Component として描いてください。** `hrefOf` は関数なので client 境界を越えられません。
 * Client Component へは、描き終えた要素として渡します。
 *
 * @param props - {@link OffsetPaginationProps} を参照。
 * @see Storybook `Features/Admin/OffsetPagination`
 */
export const OffsetPagination = withPartSpan(
  "features/admin/ui/offset-pagination/offset-pagination",
  ({ hrefOf, label, page, pageCount }: OffsetPaginationProps) => (
    <Pagination aria-label={label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious {...(page > 1 ? { href: hrefOf(page - 1) } : {})} />
        </PaginationItem>
        {toPageWindow(page, pageCount).map((entry) =>
          entry.kind === "gap" ? (
            <PaginationItem key={`gap-${entry.after}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={entry.page}>
              <PaginationLink
                aria-label={`${entry.page} ページ目`}
                href={hrefOf(entry.page)}
                isActive={entry.page === page}
              >
                {entry.page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext {...(page < pageCount ? { href: hrefOf(page + 1) } : {})} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
);

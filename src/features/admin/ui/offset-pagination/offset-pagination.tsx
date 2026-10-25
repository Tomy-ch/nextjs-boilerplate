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
import type { PageLinks } from "../../page-window";

/** `OffsetPagination` の props。 */
export type OffsetPaginationProps = {
  /** 並べる番号と行き先、前後の行き先。`toPageLinks` が組む。 */
  links: PageLinks;
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
 * 行き先は組まずに受け取ります。URL の契約は画面ごとの `query.ts` が持ち、受け取るのが
 * データだけなので、この部品は client 境界のどちら側でも描けます。
 *
 * @param props - {@link OffsetPaginationProps} を参照。
 * @see Storybook `Features/Admin/OffsetPagination`
 */
export const OffsetPagination = withPartSpan(
  "features/admin/ui/offset-pagination/offset-pagination",
  ({ label, links }: OffsetPaginationProps) => (
    <Pagination aria-label={label}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            {...(links.previousHref === undefined ? {} : { href: links.previousHref })}
          />
        </PaginationItem>
        {links.entries.map((entry) =>
          entry.kind === "gap" ? (
            <PaginationItem key={`gap-${entry.after}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={entry.page}>
              <PaginationLink
                aria-label={`${entry.page} ページ目`}
                href={entry.href}
                isActive={entry.current}
              >
                {entry.page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext {...(links.nextHref === undefined ? {} : { href: links.nextHref })} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
);

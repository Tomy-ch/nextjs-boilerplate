import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import type { PurchaseHistoryEntry } from "@/model/purchase/purchase";
import { useCartStore } from "@/stores/cart-store";

import { purchaseDetailPath } from "../facade/paths/paths";
import { HISTORY_ENTRIES, LARGE_AMOUNT_ENTRY, LOADED_ENTRIES } from "../purchases.fixture";
import { toPurchaseHistoryHref } from "./period";
import { PurchaseHistoryEmpty } from "./ui/empty/empty";
import { type PurchaseListEntry, PurchaseLoadMoreList } from "./ui/purchase-list/purchase-list";
import { PurchaseHistoryView } from "./view";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
  { href: "/mypage", label: "マイページ" },
];

/**
 * route と同じ器で包む。
 *
 * @remarks
 * `(shop)/layout.tsx` が置く shell とカート、`page.tsx` が置く見出し・読み幅を再現します。
 * 取得を伴わずに、画面がどう収まるかを確かめられます。
 */
function withPageFrame(Story: () => ReactElement) {
  useCartStore.setState({ isOpen: false });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction cart={CART} />}
        navItems={NAV_ITEMS}
        sidebar={<CartPanel cart={CART} />}
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <PageHeader>
            <div>
              <PageHeaderTitle>購入履歴</PageHeaderTitle>
              <PageHeaderDescription>
                注文日時の新しい順に並んでいます。期間で絞り込めます。
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

function toEntries(purchases: readonly PurchaseHistoryEntry[]): readonly PurchaseListEntry[] {
  return purchases.map((purchase) => ({
    purchase,
    href: purchaseDetailPath(purchase.code),
  }));
}

const meta = {
  title: "Page/Purchases/History",
  component: PurchaseHistoryView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "購入履歴です。**ページ送りではなく増分取得**で、末尾へ近づくと続きが継ぎ足されます。",
          "期間の絞り込みはクエリでサーバへ渡します。取得済みのページに条件を掛けると、",
          "条件に合う古い購入が落ちた一覧になるためです。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof PurchaseHistoryView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。全期間で、続きがある状態。末尾に近づけば自動で読むため操作は出さない。 */
export const Default: Story = {
  args: {
    period: { kind: "all" },
    children: (
      <PurchaseLoadMoreList entries={toEntries(HISTORY_ENTRIES)} loadMore={{ status: "idle" }} />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット幅。絞り込みの操作が折り返し始める。 */
export const Tablet: Story = {
  args: Default.args,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。区分と入力欄が段に落ち、行の金額は左詰めの並びへ寄る。 */
export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 期間で絞り込んでいる状態。効いている条件を chip で出す。 */
export const Filtered: Story = {
  args: {
    period: { kind: "range", from: "2026-06-01", to: "2026-08-17" },
    children: (
      <PurchaseLoadMoreList
        entries={toEntries(HISTORY_ENTRIES.slice(0, 3))}
        loadMore={{ status: "exhausted" }}
      />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 暦月で絞り込んでいる状態。入力欄が月の 1 つに変わる。 */
export const FilteredByMonth: Story = {
  args: {
    period: { kind: "month", month: "2026-07" },
    children: (
      <PurchaseLoadMoreList
        entries={toEntries(HISTORY_ENTRIES.slice(1, 2))}
        loadMore={{ status: "exhausted" }}
      />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 続きを取得している最中。読み終えた分は残したまま、末尾で進行を示す。 */
export const LoadingMore: Story = {
  args: {
    period: { kind: "all" },
    children: (
      <PurchaseLoadMoreList entries={toEntries(LOADED_ENTRIES)} loadMore={{ status: "loading" }} />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 続きの取得に失敗した状態。ここでだけ読み直す操作を出す。 */
export const LoadMoreFailed: Story = {
  args: {
    period: { kind: "all" },
    children: (
      <PurchaseLoadMoreList
        entries={toEntries(HISTORY_ENTRIES)}
        loadMore={{ status: "failed", onRetry: () => {} }}
      />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 最後まで読み終えた状態。続きが無いので末尾に何も出さない。 */
export const ReachedEnd: Story = {
  args: {
    period: { kind: "all" },
    children: (
      <PurchaseLoadMoreList
        entries={toEntries([...LOADED_ENTRIES, LARGE_AMOUNT_ENTRY])}
        loadMore={{ status: "exhausted" }}
      />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 購入が 1 件も無い状態。買い物へ戻る道だけを出す。 */
export const NoPurchases: Story = {
  args: {
    period: { kind: "all" },
    children: <PurchaseHistoryEmpty reason="none" />,
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 絞り込んだ結果が 0 件の状態。条件を外せば出てくることを示す。 */
export const NoResultInPeriod: Story = {
  args: {
    period: { kind: "recent", days: 7 },
    children: (
      <PurchaseHistoryEmpty reason="filtered" resetHref={toPurchaseHistoryHref({ kind: "all" })} />
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

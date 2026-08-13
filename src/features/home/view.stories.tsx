import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import type { ProductListItem, ProductRankingEntry, ProductRef } from "@/model/product/product";
import { useCartStore } from "@/stores/cart-store";

import { HomeView } from "./view";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
];

const FAILURE_MESSAGE = "問題が発生しました。時間をおいて再試行してください。";

/**
 * route と同じ器で包む。`(shop)/layout.tsx` が置く shell と `page.tsx` が置く読み幅・見出しを
 * story 側で再現し、画面がどう収まるかを取得なしで確かめられるようにする。
 *
 * カートは空にする。トップにはカートへ入れる操作が無く、脇の領域が出ていると本文の取り分が
 * 変わって段の見え方が実物とずれる。
 */
function withPageFrame(Story: () => React.ReactElement) {
  useCartStore.setState({ lines: [], isOpen: false });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction />}
        navItems={NAV_ITEMS}
        sidebar={<CartPanel />}
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <PageHeader>
            <div>
              <PageHeaderTitle>ようこそ</PageHeaderTitle>
              <PageHeaderDescription>
                新着商品と売上ランキング、カテゴリから商品を探せます。
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

let itemSeq = 0;

function item(overrides: Partial<ProductListItem> = {}): ProductListItem {
  itemSeq += 1;

  return {
    id: `0195f0c2-0000-7000-8000-${String(itemSeq).padStart(12, "0")}`,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "オーディオ",
    statusName: "公開",
    imageUrl: FRONT_IMAGE_URL,
    ...overrides,
  };
}

const NEW_ARRIVALS: readonly ProductListItem[] = [
  item(),
  item({ name: "スマートウォッチ", price: "129.00", imageUrl: null }),
  item({ name: "USB-C ハブ", price: "45.50" }),
  item({
    name: "ノイズキャンセリング ヘッドホン（over-ear・第 3 世代・ケース同梱）",
    price: "349.00",
  }),
  item({ name: "編組ケーブル 2m", price: "0.99", imageUrl: null }),
  item({ name: "モバイルバッテリー", price: "59.99" }),
  item({ name: "アルミスタンド", price: "24.00" }),
  item({ name: "メカニカルキーボード", price: "89.00", imageUrl: null }),
];

let entrySeq = 0;

function entry(overrides: Partial<ProductRankingEntry> = {}): ProductRankingEntry {
  entrySeq += 1;

  return {
    productId: `0195f0c2-0000-7000-8000-${String(entrySeq).padStart(12, "0")}`,
    name: "ワイヤレスイヤホン",
    price: "19.99",
    soldQuantity: 128,
    ...overrides,
  };
}

const RANKING: readonly ProductRankingEntry[] = [
  entry(),
  entry({ name: "スマートウォッチ", price: "129.00", soldQuantity: 96 }),
  entry({ name: "USB-C ハブ", price: "45.50", soldQuantity: 54 }),
  entry({ name: "編組ケーブル 2m", price: "0.99", soldQuantity: 12 }),
  entry({ name: "モバイルバッテリー", price: "1299.00", soldQuantity: 3 }),
];

const CATEGORIES: readonly ProductRef[] = [
  { id: "c1", name: "オーディオ" },
  { id: "c2", name: "ウェアラブル" },
  { id: "c3", name: "アクセサリ" },
  { id: "c4", name: "PC 周辺機器" },
  { id: "c5", name: "スマートホーム" },
  { id: "c6", name: "カメラ・映像機器" },
];

const meta = {
  title: "Page/Home",
  component: HomeView,
  parameters: {
    docs: { story: { inline: false, iframeHeight: 900 } },
    layout: "fullscreen",
  },
  decorators: [withPageFrame],
  args: {
    newArrivals: { status: "ready", value: NEW_ARRIVALS },
    ranking: { status: "ready", value: RANKING },
    categories: { status: "ready", value: CATEGORIES },
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 3 系統すべてが揃った状態。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。新着の段が減る。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。新着は 2 列のまま、ランキングの行が詰まる。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** ランキングだけが落ちた状態。残りの 2 系統はそのまま出る。 */
export const RankingFailed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { ranking: { status: "failed", message: FAILURE_MESSAGE } },
};

/** 3 系統とも落ちた状態。どれが落ちたかが文からわかる。 */
export const AllFailed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    newArrivals: { status: "failed", message: FAILURE_MESSAGE },
    ranking: { status: "failed", message: FAILURE_MESSAGE },
    categories: { status: "failed", message: FAILURE_MESSAGE },
  },
};

/** 取得は成功したが中身が無い状態。節ごと描かず、見出しも出さない。 */
export const Empty: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    newArrivals: { status: "ready", value: [] },
    ranking: { status: "ready", value: [] },
    categories: { status: "ready", value: [] },
  },
};

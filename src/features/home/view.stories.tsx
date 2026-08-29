import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { EMPTY_CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import type {
  ProductCategory,
  ProductListItem,
  ProductRankingEntry,
} from "@/model/product/product";
import { toProductId } from "@/model/product/product";
import { useCartStore } from "@/stores/cart-store";
import { SAMPLE_ITEM_URLS } from "~catalog/lib/sample-asset";
import { CategoryLinks } from "./ui/category-links/category-links";
import { SampleNotice } from "./ui/sample-notice/sample-notice";
import { HomeView } from "./view";

/** 一覧に出る絵。 */
const FRONT_IMAGE_URL = SAMPLE_ITEM_URLS[0];

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
 *
 * 断り書きも枠に含める。実画面では見出しより前に出るため、外すと余白と重心が実物とずれる。
 *
 * 分類の帯も枠が持つ。実画面ではこの節が静的な殻の側に居て `HomeView` の外にあるため
 * （[categories-content.tsx](./categories-content.tsx)）、枠に置かないと段の見え方が実物とずれる。
 */
function withPageFrame(Story: () => React.ReactElement) {
  useCartStore.setState({ isOpen: false });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction cart={EMPTY_CART} />}
        navItems={NAV_ITEMS}
        sidebar={<CartPanel cart={EMPTY_CART} />}
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <SampleNotice />
          <PageHeader>
            <div>
              <PageHeaderTitle>ようこそ</PageHeaderTitle>
              <PageHeaderDescription>
                新着商品と売れ筋ランキング、カテゴリから商品を探せます。
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <div className="space-y-10 py-4">
            <Story />
            <CategoryLinks categories={CATEGORIES} />
          </div>
        </ContentContainer>
      </AppShell>
    </div>
  );
}

let itemSeq = 0;

function item(overrides: Partial<ProductListItem> = {}): ProductListItem {
  itemSeq += 1;

  return {
    id: toProductId(`0195f0c2-0000-7000-8000-${String(itemSeq).padStart(12, "0")}`),
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
    productId: toProductId(`0195f0c2-0000-7000-8000-${String(entrySeq).padStart(12, "0")}`),
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

const CATEGORIES: readonly ProductCategory[] = [
  { id: "c1", code: 10, name: "オーディオ" },
  { id: "c2", code: 20, name: "ウェアラブル" },
  { id: "c3", code: 30, name: "アクセサリ" },
  { id: "c4", code: 40, name: "PC 周辺機器" },
  { id: "c5", code: 50, name: "スマートホーム" },
  { id: "c6", code: 60, name: "カメラ・映像機器" },
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
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 要求ごとに取る 2 系統が揃った状態。 */
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

/** ランキングだけが落ちた状態。残りはそのまま出る。 */
export const RankingFailed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: { ranking: { status: "failed", message: FAILURE_MESSAGE } },
};

/** 取りに行った 2 系統とも落ちた状態。どれが落ちたかが文からわかる。分類は殻の側なので残る。 */
export const AllFailed: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    newArrivals: { status: "failed", message: FAILURE_MESSAGE },
    ranking: { status: "failed", message: FAILURE_MESSAGE },
  },
};

/** 取得は成功したが中身が無い状態。節ごと描かず、見出しも出さない。 */
export const Empty: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    newArrivals: { status: "ready", value: [] },
    ranking: { status: "ready", value: [] },
  },
};

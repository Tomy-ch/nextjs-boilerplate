import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { CART } from "@/features/cart/cart.fixture";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import type { Cart } from "@/model/cart/cart";
import type { ProductListItem } from "@/model/product/product";
import { useCartStore } from "@/stores/cart-store";
import { FILTER_KEY } from "../facade/list-url/list-url";
import type { FilterOption } from "./query";
import type { FilterGroup } from "./ui/filter-fields/filter-fields";
import { ProductLoadMoreList } from "./ui/load-more-list/load-more-list";
import { ProductListView } from "./view";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
];

/**
 * route と同じ器で包む。`(shop)/layout.tsx` が置く shell とカート、`page.tsx` が置く読み幅を
 * story 側で再現し、画面がどう収まるかを取得なしで確かめられるようにする。
 *
 * カートは `parameters.cart` で story ごとに差し替える。空のカートでは脇の領域が消えて本文が
 * 全幅になるため、器の見え方そのものが変わる。
 *
 * 開いた状態は `parameters.cartOpen` で明示する。種まきは初期状態の再現であって追加操作ではないため、
 * 追加が立てた要求はここで畳む。この値は幅を問わず効き、脇に常設できる幅では領域そのものの有無に、
 * それ未満では drawer の開閉になる。
 */
function withPageFrame(
  Story: () => React.ReactElement,
  context: { parameters: { cart?: Cart; cartOpen?: boolean } },
) {
  const cart = context.parameters.cart ?? CART;

  useCartStore.setState({ isOpen: context.parameters.cartOpen === true });

  return (
    <div className="flex min-h-screen flex-col">
      <AppShell
        footer={<p>Next.js / React のプレゼンテーション層 boilerplate です。</p>}
        headerActions={<CartHeaderAction cart={cart} />}
        navItems={NAV_ITEMS}
        sidebar={<CartPanel cart={cart} />}
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

/**
 * 契約が許す最大長。`name` は 255 で、分類名・状態名に上限の宣言は無い
 * （`src/adapters/gen/api/endpoints.zod.ts`）。上限の無い項目は、器が折り返しで耐えるかを見る。
 */
const MAX_NAME_LENGTH = 255;

/** 折り返しの有無を見分けるため、区切りの無い長い語と日本語を混ぜる。 */
function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
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
    imageUrl: null,
    ...overrides,
  };
}

const ITEMS: readonly ProductListItem[] = [
  item({ imageUrl: FRONT_IMAGE_URL }),
  item({ name: "スマートウォッチ", price: "129.00", categoryName: "ウェアラブル" }),
  item({ name: "USB-C ハブ", price: "45.50", quantity: 0, statusName: "在庫切れ" }),
  item({
    name: "ノイズキャンセリング ヘッドホン（over-ear・第 3 世代・ケース同梱）",
    price: "349.00",
    imageUrl: FRONT_IMAGE_URL,
  }),
  item({ name: "編組ケーブル 2m", price: "0.99", categoryName: "アクセサリ" }),
  item({ name: "モバイルバッテリー", price: "59.99", quantity: 2 }),
];

const CATEGORY_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "すべて" },
  { value: "c1", label: "オーディオ" },
  { value: "c2", label: "ウェアラブル" },
  { value: "c3", label: "アクセサリ" },
];

const GROUPS: readonly FilterGroup[] = [
  { key: FILTER_KEY.CATEGORY, legend: "カテゴリ", options: CATEGORY_OPTIONS },
];

const SORT_OPTIONS: readonly FilterOption[] = [
  { value: "", label: "新着順" },
  { value: "publishedAt", label: "古い順" },
];

const meta = {
  title: "Page/Products/List",
  component: ProductListView,
  parameters: {
    docs: { story: { inline: false, iframeHeight: 900 } },
    layout: "fullscreen",
  },
  decorators: [withPageFrame],
  args: {
    groups: GROUPS,
    sortOptions: SORT_OPTIONS,
    selection: {},
    children: <ProductLoadMoreList hasNext items={ITEMS} total={10} />,
  },
} satisfies Meta<typeof ProductListView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 条件を付けずに開いた状態。PC では絞り込みが脇に常設される。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。脇の領域が消え、絞り込みは下端の操作から開く。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。検索と並び替えが折り返し、カードは 1 列になる。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 条件に合う商品が無い状態。次に何をすればよいかを添える。 */
export const Empty: Story = {
  args: {
    children: <ProductLoadMoreList hasNext={false} items={[]} total={0} />,
  },
};

/** 絞り込みと並び替えが効いている状態。効いている条件が chip で並び、1 つずつ外せる。 */
export const Filtered: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    selection: {
      [FILTER_KEY.CATEGORY]: "c1",
      [FILTER_KEY.KEYWORD]: "イヤホン",
      [FILTER_KEY.SORT]: "publishedAt",
    },
    children: <ProductLoadMoreList hasNext items={ITEMS.slice(0, 2)} total={2} />,
  },
};

/** スマホで条件が効いている状態。効いている数が下端の操作に付く。 */
export const FilteredMobile: Story = {
  ...Filtered,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** スマホで絞り込みを開いた状態。結果が隠れるため、確定するまで反映しない。 */
export const FilterSheetOpenMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /絞り込み/ }));
  },
};

/** 続きを読み込んでいる状態。読み込み中でも読み終えた分は残す。 */
export const LoadingMore: Story = {
  args: {
    children: <ProductLoadMoreList hasNext items={ITEMS} loading total={10} />,
  },
};

/** 続きの読み込みに失敗した状態。読み終えた分を捨てず、もう一度試せるようにする。 */
export const LoadMoreFailed: Story = {
  args: {
    children: <ProductLoadMoreList failed hasNext items={ITEMS} total={10} />,
  },
};

/** 最後まで読み終えた状態。続きが無いので操作を出さない。 */
export const ReachedEnd: Story = {
  args: {
    children: <ProductLoadMoreList hasNext={false} items={ITEMS} total={6} />,
  },
};

/**
 * 契約の上限いっぱいの値。カード内で商品名が折り返したときに価格と在庫の行が押し出されないか、
 * 脇の絞り込みに長い分類名が並んだときに本文が潰れないかを見る。
 */
export const MaxLength: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    groups: [
      {
        key: FILTER_KEY.CATEGORY,
        legend: "カテゴリ",
        options: [
          { value: "", label: "すべて" },
          { value: "c1", label: longText(40) },
        ],
      },
    ],
    selection: { [FILTER_KEY.CATEGORY]: "c1", [FILTER_KEY.KEYWORD]: longText(60) },
    children: (
      <ProductLoadMoreList
        hasNext
        items={[
          item({ name: longText(MAX_NAME_LENGTH), price: "999999999.999" }),
          item({
            name: longText(MAX_NAME_LENGTH),
            quantity: 0,
            imageUrl: FRONT_IMAGE_URL,
            statusName: longText(20),
          }),
          item({ name: longText(60), categoryName: longText(40) }),
        ]}
      />
    ),
  },
};

/** タブレットでの最大長。段組みが減り、絞り込みは下端へ移る。 */
export const MaxLengthTablet: Story = {
  ...MaxLength,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホでの最大長。カードが 1 列になり、折り返した商品名がカードの高さを押し広げる。 */
export const MaxLengthMobile: Story = {
  ...MaxLength,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** PC でカートを開いた状態。脇の領域が本文の幅を持っていく。 */
export const WithCartPC: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  parameters: { cartOpen: true },
};

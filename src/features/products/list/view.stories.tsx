import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import type { Product } from "@/model/product/product";
import { type CartLineInput, useCartStore } from "@/stores/cart-store";

import { ProductList } from "./view";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";

const NAV_ITEMS = [
  { href: "/products", label: "商品" },
  { href: "/purchases", label: "購入履歴" },
];

/** カートへ積む 1 行。数量を省くと 1 個として積む。 */
type CartSeed = { line: CartLineInput; quantity?: number };

const WATCH: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-0000000000f1",
  name: "スマートウォッチ",
  price: "129.00",
  statusName: "公開",
  imageUrl: null,
  stockQuantity: 4,
};

const HUB: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-0000000000f2",
  name: "USB-C ハブ（7 ポート・100W PD 対応モデル）",
  price: "45.50",
  statusName: "残りわずか",
  imageUrl: "/src/components/design-system/display/media-image/invertocat.png",
  stockQuantity: 2,
};

const CABLE: CartLineInput = {
  productId: "0195f0c2-0000-7000-8000-0000000000f3",
  name: "編組ケーブル 2m",
  price: "0.99",
  statusName: "公開",
  imageUrl: null,
  stockQuantity: 30,
};

/** 既定のカート。`parameters.cart` を渡した story はそれで上書きする。 */
const DEFAULT_CART: readonly CartSeed[] = [{ line: WATCH }];

/**
 * route と同じ器で包む。`(shop)/layout.tsx` が置く shell とカート、`page.tsx` が置く読み幅を
 * story 側で再現し、画面がどう収まるかを取得なしで確かめられるようにする。
 *
 * カートは `parameters.cart` で story ごとに差し替える。空のカートでは脇の領域が消えて本文が
 * 全幅になるため、器の見え方そのものが変わる。
 *
 * 開いた状態は `parameters.cartOpen` で明示する。種まきは初期状態の再現であって追加操作ではないため、
 * 追加が立てた要求はここで畳む。脇に常設できる幅ではこの値を見ないので、効くのはタブレットとスマホだけ。
 */
function withPageFrame(
  Story: () => React.ReactElement,
  context: { parameters: { cart?: readonly CartSeed[]; cartOpen?: boolean } },
) {
  useCartStore.setState({ lines: [] });

  for (const seed of context.parameters.cart ?? DEFAULT_CART) {
    useCartStore.getState().add(seed.line);

    if (seed.quantity !== undefined) {
      useCartStore.getState().setQuantity(seed.line.productId, seed.quantity);
    }
  }

  useCartStore.setState({ isOpen: context.parameters.cartOpen === true });

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
          <Story />
        </ContentContainer>
      </AppShell>
    </div>
  );
}

/**
 * 契約が許す最大長。`name` は 255 で、`description` / 分類名 / 状態名に上限の宣言は無い
 * （`src/adapters/gen/api/endpoints.zod.ts`）。上限の無い項目は、器が折り返しで耐えるかを見る。
 */
const MAX_NAME_LENGTH = 255;

/** 折り返しの有無を見分けるため、区切りの無い長い語と日本語を混ぜる。 */
function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

const meta = {
  title: "Page/Products/List",
  component: ProductList,
  parameters: { layout: "fullscreen" },
  decorators: [withPageFrame],
} satisfies Meta<typeof ProductList>;

export default meta;
type Story = StoryObj<typeof meta>;

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    name: "ワイヤレスイヤホン",
    description: "<p>ノイズキャンセリング対応</p>",
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    imagePaths: [],
    ...overrides,
  };
}

/** 商品が並んでいる状態。 */
export const Default: Story = {
  args: {
    items: [
      { product: product(), imageUrl: null },
      { product: product({ name: "スマートウォッチ", price: "129.00" }), imageUrl: null },
      {
        product: product({ name: "USB-C ハブ", price: "45.50", quantity: 0 }),
        imageUrl: null,
      },
    ],
  },
};

/** 条件に合う商品が無い状態。次に何をすればよいかを添える。 */
export const Empty: Story = {
  args: { items: [] },
};

/** 件数が多い場合。段組みが折り返し、名前の長い商品が行の高さを揃えられるかを見る。 */
export const ManyItems: Story = {
  args: {
    items: [
      { product: product(), imageUrl: FRONT_IMAGE_URL },
      { product: product({ name: "スマートウォッチ", price: "129.00" }), imageUrl: null },
      { product: product({ name: "USB-C ハブ", price: "45.50", quantity: 0 }), imageUrl: null },
      {
        product: product({
          name: "ノイズキャンセリング ヘッドホン（over-ear・第 3 世代・ケース同梱）",
          price: "349.00",
        }),
        imageUrl: FRONT_IMAGE_URL,
      },
      { product: product({ name: "編組ケーブル 2m", price: "0.99" }), imageUrl: null },
      {
        product: product({
          name: "モバイルバッテリー",
          price: "59.99",
          quantity: 2,
          stockWarningThreshold: 3,
        }),
        imageUrl: null,
      },
      {
        product: product({
          name: "スタンド",
          price: "24.00",
          status: { id: "s2", name: "非公開" },
        }),
        imageUrl: null,
      },
      { product: product({ name: "キーボード", price: "89.00" }), imageUrl: FRONT_IMAGE_URL },
      { product: product({ name: "マウスパッド", price: "12.00" }), imageUrl: null },
    ],
  },
};

/** PC でカートが空の場合。脇の領域ごと消え、一覧が全幅になる。 */
export const EmptyCart: Story = {
  args: { ...Default.args },
  parameters: { cart: [] },
};

/**
 * PC で契約の上限いっぱいの値。カード内で商品名が折り返したときに、価格と在庫の行が押し出されないか、
 * 段組みの高さが揃うかを見る。
 */
export const MaxLengthPC: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    items: [
      {
        product: product({ name: longText(MAX_NAME_LENGTH), price: "999999999.999" }),
        imageUrl: null,
      },
      {
        product: product({ name: longText(MAX_NAME_LENGTH), quantity: 0 }),
        imageUrl: FRONT_IMAGE_URL,
      },
      {
        product: product({ name: longText(60), category: { id: "c1", name: longText(40) } }),
        imageUrl: null,
      },
    ],
  },
  parameters: {
    cart: [
      { line: { ...HUB, name: longText(MAX_NAME_LENGTH), price: "999999999.999" }, quantity: 2 },
    ],
  },
};

/** タブレットでの最大長。カードの段組みが減り、カートは脇から drawer へ移る。 */
export const MaxLengthTablet: Story = {
  ...MaxLengthPC,
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホでの最大長。カードが 1 列になり、折り返した商品名がカードの高さを押し広げる。 */
export const MaxLengthMobile: Story = {
  ...MaxLengthPC,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** PC でカートに複数入っている場合。一覧の幅が脇のカートのぶん狭まる。 */
export const FilledCartPC: Story = {
  args: { ...Default.args },
  globals: { viewport: { value: "desktop", isRotated: false } },
  parameters: {
    cart: [
      { line: WATCH, quantity: 3 },
      { line: HUB, quantity: 2 },
      { line: CABLE, quantity: 12 },
    ],
  },
};

/** タブレットでカートに複数入っている状態。header の入口から一覧へ被せて開く。 */
export const FilledCartTablet: Story = {
  ...FilledCartPC,
  globals: { viewport: { value: "tablet", isRotated: false } },
  parameters: { ...FilledCartPC.parameters, cartOpen: true },
};

/** スマホでカートに複数入っている状態。カートは一覧へ被せて開く。 */
export const FilledCartMobile: Story = {
  ...FilledCartPC,
  globals: { viewport: { value: "mobile2", isRotated: false } },
  parameters: { ...FilledCartPC.parameters, cartOpen: true },
};

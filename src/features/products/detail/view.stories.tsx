import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppShell } from "@/components/shell/app-shell/app-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import { CartHeaderAction } from "@/features/cart/ui/header-action/header-action";
import { CartPanel } from "@/features/cart/ui/panel/panel";
import type { Product } from "@/model/product/product";
import { type CartLineInput, useCartStore } from "@/stores/cart-store";

import { ProductDetail } from "./view";

const FRONT_IMAGE_URL = "/src/components/design-system/display/media-image/invertocat.png";
const IMAGE_URLS = [FRONT_IMAGE_URL, "/next.svg", "/globe.svg"];

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
 */
function withPageFrame(
  Story: () => React.ReactElement,
  context: { parameters: { cart?: readonly CartSeed[] } },
) {
  useCartStore.setState({ lines: [] });

  for (const seed of context.parameters.cart ?? DEFAULT_CART) {
    useCartStore.getState().add(seed.line);

    if (seed.quantity !== undefined) {
      useCartStore.getState().setQuantity(seed.line.productId, seed.quantity);
    }
  }

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
  title: "Page/Products/Detail",
  component: ProductDetail,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "商品 1 件の詳細です。画像は枚数によらず carousel に載せ、送り先の一覧を必ず下に並べます。",
          "**送り操作は canvas でも効きます。** 一覧の追従は表示中の slide を観測するため、",
          "横スクロールさせると印が移ります。",
        ].join(""),
      },
    },
  },
  decorators: [withPageFrame],
} satisfies Meta<typeof ProductDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: crypto.randomUUID(),
    name: "ワイヤレスイヤホン",
    description: "<p>ノイズキャンセリング対応。連続再生 30 時間。</p>",
    price: "19.99",
    quantity: 12,
    stockWarningThreshold: null,
    status: { id: "s1", name: "公開" },
    category: { id: "c1", name: "オーディオ" },
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
    imagePaths: ["earphone.png"],
    ...overrides,
  };
}

/** 既定。画像が複数あり、送り操作と一覧の両方が出る。 */
export const Default: Story = {
  args: { imageUrls: IMAGE_URLS, product: product() },
};

/** 画像が 1 枚の場合。一覧は出るが、送り先が無いので送り操作は出ない。 */
export const SingleImage: Story = {
  args: { imageUrls: [FRONT_IMAGE_URL], product: product() },
};

/** 画像が無い場合。代替画像を 1 枚として置く。 */
export const NoImage: Story = {
  args: { imageUrls: [], product: product({ imagePaths: [] }) },
};

/** 在庫が境界以下の場合。残りわずかであることを在庫の隣で示す。 */
export const LowStock: Story = {
  args: {
    imageUrls: IMAGE_URLS,
    product: product({ quantity: 2, stockWarningThreshold: 3 }),
  },
};

/** 在庫が無い場合。カートへ入れる操作を押せなくする。 */
export const OutOfStock: Story = {
  args: { imageUrls: IMAGE_URLS, product: product({ quantity: 0 }) },
};

/** 未公開の場合。公開日時は空欄ではなく未設定として示す。 */
export const Unpublished: Story = {
  args: {
    imageUrls: IMAGE_URLS,
    product: product({ description: null, publishedAt: null }),
  },
};

/** カートが空の場合。脇の領域ごと消え、本文が全幅になる。 */
export const EmptyCart: Story = {
  args: { imageUrls: IMAGE_URLS, product: product() },
  parameters: { cart: [] },
};

/** カートに複数入っている場合。明細が縦に伸び、小計と操作だけが残って明細が送られる。 */
export const FilledCart: Story = {
  args: { imageUrls: IMAGE_URLS, product: product() },
  parameters: {
    cart: [
      { line: WATCH, quantity: 3 },
      { line: HUB, quantity: 2 },
      { line: CABLE, quantity: 12 },
    ],
  },
};

/** 表示中の商品がすでにカートへ入っている場合。在庫ぶん入ると追加操作が押せなくなる。 */
export const AlreadyInCart: Story = {
  args: { imageUrls: IMAGE_URLS, product: product({ id: WATCH.productId, quantity: 4 }) },
  parameters: { cart: [{ line: WATCH, quantity: 4 }] },
};

/**
 * 契約の上限いっぱいの値。商品名 255 文字、上限の宣言が無い説明・分類・状態にも長い値を入れ、
 * 見出しの折り返し・バッジの並び・カート明細の器が耐えるかを見る。
 */
export const MaxLength: Story = {
  args: {
    imageUrls: IMAGE_URLS,
    product: product({
      name: longText(MAX_NAME_LENGTH),
      description: `<p>${longText(600)}</p>`,
      category: { id: "c1", name: longText(40) },
      status: { id: "s1", name: longText(24) },
      price: "999999999.999",
      quantity: 2147483647,
    }),
  },
  parameters: {
    cart: [
      { line: { ...HUB, name: longText(MAX_NAME_LENGTH), price: "999999999.999" }, quantity: 2 },
    ],
  },
};

/**
 * 狭い幅での最大長。2 カラムが縦積みになり、カートは本文の下へ回る。見出しの折り返しが
 * 何行になるか、carousel の送りとサムネイルが幅に収まるかを見る。
 */
export const MaxLengthMobile: Story = {
  ...MaxLength,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 狭い幅でカートに複数入っている状態。明細が本文の下へ積まれ、局所スクロールが要らなくなる。 */
export const FilledCartMobile: Story = {
  ...FilledCart,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

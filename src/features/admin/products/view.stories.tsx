import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { userEvent, within } from "storybook/test";
import { CursorPagination } from "@/components/app-starter/cursor-pagination/cursor-pagination";
import { Button } from "@/components/design-system/action/button/button";
import { AdminShell } from "@/components/shell/admin-shell/admin-shell";
import type { AdminShellNavGroup } from "@/components/shell/admin-shell/admin-shell.definition";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { toProductId } from "@/model/product/product";
import { ADMIN_PRODUCT_LIST_PATH } from "../paths";
import type { AdminProductFilterOption } from "./filter-option";
import type { AdminProductListConditions } from "./query";
import type { AdminProductRow } from "./row";
import { toStatusTone } from "./status-tone";
import { AdminProductTable } from "./ui/table/table";
import { AdminProductListView } from "./view";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
];

const CATEGORY_OPTIONS: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての分類" },
  { value: "1", label: "電子機器" },
  { value: "2", label: "書籍" },
  { value: "4", label: "食品" },
];

const STATUS_OPTIONS: readonly AdminProductFilterOption[] = [
  { value: "", label: "すべての状態" },
  { value: "1", label: "在庫あり" },
  { value: "2", label: "在庫切れ" },
  { value: "6", label: "入荷待ち" },
];

const NO_CONDITIONS: AdminProductListConditions = {
  keyword: "",
  categoryCode: "",
  statusCode: "",
};

/**
 * route と同じ器で包む。`admin/layout.tsx` が置く shell と `page.tsx` が置く見出しを story 側で
 * 再現し、画面がどう収まるかを取得なしで確かめられるようにする。
 */
function withPageFrame(Story: () => React.ReactElement) {
  return (
    <AdminShell
      consoleName="管理"
      headerActions={
        <Button asChild size="sm" variant="outline">
          <Link href="/products">ユーザー画面へ</Link>
        </Button>
      }
      homeHref={ADMIN_PRODUCT_LIST_PATH}
      navGroups={NAV_GROUPS}
      siteHref="/"
      siteName="nextjs-boilerplate"
    >
      <ContentContainer className="py-8">
        <PageHeader>
          <div>
            <PageHeaderTitle>商品一覧管理</PageHeaderTitle>
            <PageHeaderDescription>
              公開済みの商品を確認し、作成・編集・在庫の補充へ進みます。
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <Story />
      </ContentContainer>
    </AdminShell>
  );
}

/**
 * 契約が許す最大長。`name` は 255 で、分類名・状態名に上限の宣言は無い
 * （`src/adapters/gen/api/endpoints.zod.ts`）。上限の無い項目は、表が折り返しで耐えるかを見る。
 */
const MAX_NAME_LENGTH = 255;

/** 折り返しの有無を見分けるため、区切りの無い長い語と日本語を混ぜる。 */
function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

let itemSeq = 0;

/** 状態のコードから、実際の画面と同じ見た目の割り当てで 1 行を作る。 */
function item(
  overrides: Partial<AdminProductRow> & { readonly statusCode?: number } = {},
): AdminProductRow {
  itemSeq += 1;
  const { statusCode = 1, ...rest } = overrides;

  return {
    id: toProductId(`0195f0c2-0000-7000-8000-${String(itemSeq).padStart(12, "0")}`),
    name: "ワイヤレスイヤホン",
    price: "19.99",
    quantity: 12,
    categoryName: "電子機器",
    statusName: "在庫あり",
    statusTone: toStatusTone(statusCode),
    ...rest,
  };
}

/** 状態は 4 つの区分がそろうように選ぶ。色の割り当てを 1 画面で見比べられるようにするため。 */
const ITEMS: readonly AdminProductRow[] = [
  item(),
  item({
    name: "スマートウォッチ",
    price: "129.00",
    quantity: 0,
    statusName: "在庫切れ",
    statusCode: 2,
  }),
  item({ name: "USB-C ハブ", price: "45.50", quantity: 4, statusName: "入荷待ち", statusCode: 6 }),
  item({
    name: "編組ケーブル 2m",
    price: "0.99",
    categoryName: "食品",
    quantity: 480,
    statusName: "販売終了",
    statusCode: 4,
  }),
  item({
    name: "モバイルバッテリー",
    price: "1299.00",
    quantity: 2,
    statusName: "限定販売",
    statusCode: 10,
  }),
  item({
    name: "有線イヤホン",
    price: "12.00",
    quantity: 8,
    statusName: "新設された状態",
    statusCode: 99,
  }),
];

const meta = {
  title: "Page/Admin/Products/List",
  component: AdminProductListView,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 760 },
      description: {
        component: [
          "管理側の商品一覧です。**canvas では遷移も取得も起きません** —— 検索・絞り込み・ページ送りを",
          "操作しても表が変わらないのはそのためで、実際は操作した時点でその URL の一覧へ移ります。",
          "行を押すと編集へ、在庫の数を押すと補充へ進みます。状態の色は 4 つの区分で、",
          "マスタに無い状態は縁だけの姿へ倒れます。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: ADMIN_PRODUCT_LIST_PATH } },
  },
  decorators: [withPageFrame],
  args: {
    conditions: NO_CONDITIONS,
    categoryOptions: CATEGORY_OPTIONS,
    statusOptions: STATUS_OPTIONS,
    children: (
      <AdminProductTable
        items={ITEMS}
        pagination={<CursorPagination aria-label="商品一覧のページ送り" nextHref="?after=next" />}
      />
    ),
  },
} satisfies Meta<typeof AdminProductListView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 先頭ページ。戻る先が無いので「前へ」は押せない。状態の色は 4 つの区分と未知の状態を並べてある。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。脇の一覧はまだ常設され、表は横幅に合わせて詰まる。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。列は商品名・価格・在庫・操作だけに絞り、絞り込みは下端の操作へ畳まれる。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** スマホで絞り込みを開いた状態。表が隠れるため、確定するまで反映しない。 */
export const FilterSheetOpenMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: /絞り込み/ }));
  },
};

/** スマホで条件が効いている状態。入力欄は overlay の中だが、chip が何で絞られているかを示す。 */
export const FilteredMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  args: { conditions: { ...NO_CONDITIONS, categoryCode: "1", statusCode: "2" } },
};

/** 途中のページ。前後のどちらへも進める。 */
export const MiddlePage: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    children: (
      <AdminProductTable
        items={ITEMS}
        pagination={
          <CursorPagination
            aria-label="商品一覧のページ送り"
            nextHref="?after=next"
            previousHref={ADMIN_PRODUCT_LIST_PATH}
          />
        }
      />
    ),
  },
};

/** 末尾のページ。次が無いので「次へ」は押せない。 */
export const LastPage: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    children: (
      <AdminProductTable
        items={ITEMS.slice(0, 2)}
        pagination={
          <CursorPagination
            aria-label="商品一覧のページ送り"
            previousHref={ADMIN_PRODUCT_LIST_PATH}
          />
        }
      />
    ),
  },
};

/** 検索語が効いている状態。入力欄に語が残り、効いていることは chip が示す。 */
export const Searched: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    conditions: { ...NO_CONDITIONS, keyword: "イヤホン" },
    children: (
      <AdminProductTable
        items={[ITEMS[0]]}
        pagination={<CursorPagination aria-label="商品一覧のページ送り" />}
      />
    ),
  },
};

/** 分類と状態で絞り込んだ状態。chip が 2 つ並び、すべてを外す操作が右端に出る。 */
export const FilteredByMaster: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    conditions: { ...NO_CONDITIONS, categoryCode: "1", statusCode: "2" },
    children: (
      <AdminProductTable
        items={ITEMS.slice(0, 3)}
        pagination={<CursorPagination aria-label="商品一覧のページ送り" />}
      />
    ),
  },
};

/** 条件に合う商品が無い状態。表の形は保ったまま、無いことだけを伝える。 */
export const Empty: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    conditions: { ...NO_CONDITIONS, keyword: "存在しない商品" },
    children: (
      <AdminProductTable
        items={[]}
        pagination={<CursorPagination aria-label="商品一覧のページ送り" />}
      />
    ),
  },
};

/** 契約上の最大長を持つ商品名。列幅を押し広げず、折り返して収まる。 */
export const LongName: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  args: {
    children: (
      <AdminProductTable
        items={[item({ name: longText(MAX_NAME_LENGTH) }), ...ITEMS.slice(0, 2)]}
        pagination={<CursorPagination aria-label="商品一覧のページ送り" />}
      />
    ),
  },
};

/** 行ごとの操作を開いた状態。編集と在庫の補充へ進める。 */
export const RowActionsOpen: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "ワイヤレスイヤホン の操作" }),
    );
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { userEvent, within } from "storybook/test";

import { Button } from "@/components/design-system/action/button/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import { AdminShell } from "@/components/shell/admin-shell/admin-shell";
import type { AdminShellNavGroup } from "@/components/shell/admin-shell/admin-shell.definition";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, idleActionState } from "@/model/action-state";
import type { Product } from "@/model/product/product";
import { toProductId } from "@/model/product/product";

import { ADMIN_PRODUCT_LIST_PATH, ADMIN_USER_LIST_PATH } from "../../paths";
import { AdminProductStockView } from "./view";

const NAV_GROUPS: readonly AdminShellNavGroup[] = [
  { label: "商品", items: [{ href: ADMIN_PRODUCT_LIST_PATH, label: "商品一覧管理" }] },
  { label: "利用者", items: [{ href: ADMIN_USER_LIST_PATH, label: "利用者一覧" }] },
];

const PRODUCT: Product = {
  id: toProductId("0195f0c2-0000-7000-8000-000000000001"),
  name: "ワイヤレスイヤホン",
  description: null,
  price: "19.99",
  quantity: 128,
  stockWarningThreshold: 3,
  status: { id: "01936f6d-0000-7000-8000-000000000101", name: "在庫あり" },
  category: { id: "01936f6d-0000-7000-8000-000000000001", name: "電子機器" },
  publishedAt: new Date("2026-08-07T09:00:00.000Z"),
  imagePaths: [],
  version: 4,
};

/** 契約が許す商品名の最大長（`src/adapters/gen/api/endpoints.zod.ts`）。 */
const MAX_NAME_LENGTH = 255;

/** 折り返しの有無を見分けるため、区切りの無い長い語と日本語を混ぜる。 */
function longText(length: number): string {
  const unit = "超高性能ワイヤレスノイズキャンセリングイヤホン-第3世代-ProMaxUltraEdition-";

  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

/** canvas では送らない。押した先で何も起きないことを、待ち続けない形で示す。 */
const idle = () => Promise.resolve(idleActionState<void>());

/** 送信が拒まれた状態を作る。 */
const rejecting = (formError: string, kind?: ErrorKind) => () =>
  Promise.resolve(failedActionState<void>({ formError, ...(kind === undefined ? {} : { kind }) }));

/** 数量の欄が弾かれた状態を作る。 */
const rejectingQuantity = () =>
  Promise.resolve(
    failedActionState<void>({
      formError: null,
      fieldErrors: { quantity: ["1 以上の整数を入力してください。"] },
    }),
  );

/** route と同じ器で包む。`admin/layout.tsx` の shell と `page.tsx` の見出し・階層を再現する。 */
function withPageFrame(Story: () => React.ReactElement) {
  return (
    <AdminShell
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={ADMIN_PRODUCT_LIST_PATH}>商品一覧管理</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{PRODUCT.name}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>在庫補充</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
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
            <PageHeaderTitle>在庫の補充</PageHeaderTitle>
            <PageHeaderDescription>
              増やす量・減らす量を指定します。更新すると一覧へ戻ります。
            </PageHeaderDescription>
          </div>
        </PageHeader>
        <Story />
      </ContentContainer>
    </AdminShell>
  );
}

/** 数量を打ち込む。見込みは打ち終えた時点の値で出る。 */
async function typeQuantity(canvasElement: HTMLElement, value: string) {
  await userEvent.type(within(canvasElement).getByLabelText(/数量/), value);
}

const meta = {
  title: "Page/Admin/Products/Stock",
  component: AdminProductStockView,
  parameters: {
    docs: {
      story: { inline: false, iframeHeight: 760 },
      description: {
        component: [
          "在庫を補充する画面です。**canvas では送信も保存も起きません**。",
          "増減は相対値で送るため、現在の在庫が読み込んだ時点の値のままでも結果は壊れませんが、",
          "見込みの値はずれます。在庫より多く差し引く要求は画面では止めず、契約が 422 で拒みます。",
        ].join(""),
      },
    },
    layout: "fullscreen",
    nextjs: { navigation: { pathname: `${ADMIN_PRODUCT_LIST_PATH}/${PRODUCT.id}/stock` } },
  },
  decorators: [withPageFrame],
  args: { product: PRODUCT, adjustAction: idle },
} satisfies Meta<typeof AdminProductStockView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 開いた直後。向きは補充が選ばれ、数量は空なので見込みは出ない。 */
export const Default: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** タブレット。脇の一覧は常設のまま、入力欄は読み幅で頭打ちになる。 */
export const DefaultTablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ。向きの選択は折り返し、脇の一覧は overlay へ畳まれる。 */
export const DefaultMobile: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 補充する量を入れた状態。見込みが現在の在庫に足した値で出る。 */
export const Replenishing: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await typeQuantity(canvasElement, "50");
  },
};

/** 差し引きを選んだ状態。同じ量でも見込みが引いた側へ動く。 */
export const Deducting: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText("差し引く"));
    await typeQuantity(canvasElement, "20");
  },
};

/**
 * 在庫より多く差し引こうとした状態。
 *
 * 見込みは負のまま出し、送信は止めない。止める根拠が読み込んだ時点の在庫しか無く、拒むかどうかを
 * 決めるのは契約の側だから。
 */
export const NegativeProjection: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByLabelText("差し引く"));
    await typeQuantity(canvasElement, "500");
  },
};

/** 在庫が尽きている商品。補充の起点として 0 がそのまま出る。 */
export const OutOfStock: Story = {
  args: { product: { ...PRODUCT, quantity: 0 } },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 数量が読めずに弾かれた状態。欄のそばに指摘が出る（要約は置かない）。 */
export const RejectedQuantity: Story = {
  args: { adjustAction: rejectingQuantity },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "在庫を更新" }));
  },
};

/** 並行して動かされて拒まれた状態。この分類にだけ読み込み直す導線を添える。 */
export const Conflicted: Story = {
  args: {
    adjustAction: rejecting("現在の状態ではこの操作を実行できません。", ErrorKind.CONFLICT),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "在庫を更新" }));
  },
};

/** 一時的に受け付けられない状態。やり直す先ではなく、時間を空ける旨だけを伝える。 */
export const Unavailable: Story = {
  args: {
    adjustAction: rejecting(
      "現在サービスを利用できません。しばらくしてから再試行してください。",
      ErrorKind.UNAVAILABLE,
    ),
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "在庫を更新" }));
  },
};

/** 契約上の最大長を持つ商品名。枠を押し広げず折り返して収まる（表と違い 1 行の見出しではない）。 */
export const LongName: Story = {
  args: { product: { ...PRODUCT, name: longText(MAX_NAME_LENGTH) } },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

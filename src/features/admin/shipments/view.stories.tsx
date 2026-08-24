import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ReactElement } from "react";
import { fn } from "storybook/test";

import { AdminShell } from "@/components/shell/admin-shell/admin-shell";
import { ContentContainer } from "@/components/shell/content-container/content-container";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/shell/page-header/page-header";
import { succeededActionState } from "@/model/action-state";

import { DISPATCH_GROUPS } from "./shipments.fixture";
import { ShipmentQueueView } from "./view";

const NAV_GROUPS = [
  { label: "集計", items: [{ href: "/admin", label: "ダッシュボード" }] },
  { label: "商品", items: [{ href: "/admin/products", label: "商品一覧管理" }] },
  { label: "注文", items: [{ href: "/admin/shipments", label: "発送" }] },
  { label: "利用者", items: [{ href: "/admin/users", label: "利用者一覧" }] },
];

/** route と同じ器で包む。 */
function withAdminFrame(Story: () => ReactElement) {
  return (
    <div className="flex min-h-screen flex-col">
      <AdminShell
        breadcrumb={null}
        consoleName="管理"
        homeHref="/admin"
        navGroups={NAV_GROUPS}
        siteHref="/"
        siteName="nextjs-boilerplate"
      >
        <ContentContainer className="py-8">
          <PageHeader>
            <div>
              <PageHeaderTitle>発送</PageHeaderTitle>
              <PageHeaderDescription>
                支払いを終えてまだ発送していない注文を、まとめて発送してよい便ごとに確認します。
              </PageHeaderDescription>
            </div>
          </PageHeader>
          <Story />
        </ContentContainer>
      </AdminShell>
    </div>
  );
}

const meta = {
  title: "Page/Admin/Shipments",
  component: ShipmentQueueView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "支払いを終えてまだ発送していない注文を、**まとめて発送してよい便ごと**に並べます。",
          "便の分け方も並び順も契約が決めており、画面は並べ直しません。",
        ].join(""),
      },
    },
  },
  args: { shipAction: fn(async () => succeededActionState({ shipped: 1, refused: 0 })) },
  decorators: [withAdminFrame],
} satisfies Meta<typeof ShipmentQueueView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。3 件たまった便と、1 件だけの便が並ぶ。 */
export const Default: Story = {
  args: { groups: DISPATCH_GROUPS },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** スマホ幅。便が縦に積まれ、注文番号が折り返す。 */
export const Mobile: Story = {
  args: Default.args,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};

/** 発送を待っている注文が無い状態。契約はこれを失敗ではなく空の並びで返す。 */
export const Empty: Story = {
  args: { groups: [] },
  globals: { viewport: { value: "desktop", isRotated: false } },
};
